import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const docsDir = path.join(repoRoot, 'docs');
const outputJsonPath = path.join(docsDir, 'module-graph.json');
const outputMarkdownPath = path.join(docsDir, 'module-graph.md');
const ignoredDirectories = new Set(['.git', 'docs', 'lib-esm', 'node_modules']);
const scannedExtensions = new Set(['.js']);

const isIdentifierCharacter = (character) =>
  /[A-Za-z0-9_$]/.test(character);

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim();
const regexPrefixCharacters = new Set(['', '(', '=', ':', ',', '[', '!', '?', '{', ';']);

const buildLineStarts = (source) => {
  const starts = [0];

  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\n') {
      starts.push(index + 1);
    }
  }

  return starts;
};

const getLineNumber = (lineStarts, index) => {
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);

    if (lineStarts[middle] <= index) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return high + 1;
};

const skipString = (source, startIndex, quoteCharacter) => {
  let index = startIndex + 1;

  while (index < source.length) {
    const character = source[index];

    if (character === '\\') {
      index += 2;
      continue;
    }

    if (quoteCharacter === '`' && character === '$' && source[index + 1] === '{') {
      index = skipBalanced(source, index + 1, '{', '}').end + 1;
      continue;
    }

    if (character === quoteCharacter) {
      return index + 1;
    }

    index += 1;
  }

  return index;
};

const skipLineComment = (source, startIndex) => {
  let index = startIndex + 2;

  while (index < source.length && source[index] !== '\n') {
    index += 1;
  }

  return index;
};

const skipBlockComment = (source, startIndex) => {
  let index = startIndex + 2;

  while (index < source.length) {
    if (source[index] === '*' && source[index + 1] === '/') {
      return index + 2;
    }

    index += 1;
  }

  return index;
};

const skipRegexLiteral = (source, startIndex) => {
  let index = startIndex + 1;
  let inCharacterClass = false;

  while (index < source.length) {
    const character = source[index];

    if (character === '\\') {
      index += 2;
      continue;
    }

    if (character === '[') {
      inCharacterClass = true;
      index += 1;
      continue;
    }

    if (character === ']' && inCharacterClass) {
      inCharacterClass = false;
      index += 1;
      continue;
    }

    if (character === '/' && !inCharacterClass) {
      index += 1;

      while (/[A-Za-z]/.test(source[index] ?? '')) {
        index += 1;
      }

      return index;
    }

    index += 1;
  }

  return index;
};

function skipBalanced(source, startIndex, openCharacter, closeCharacter) {
  let depth = 0;
  let index = startIndex;

  while (index < source.length) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (isRegexLiteralStart(source, index)) {
      index = skipRegexLiteral(source, index);
      continue;
    }

    if (character === '/' && nextCharacter === '/') {
      index = skipLineComment(source, index);
      continue;
    }

    if (character === '/' && nextCharacter === '*') {
      index = skipBlockComment(source, index);
      continue;
    }

    if (character === '\'' || character === '"' || character === '`') {
      index = skipString(source, index, character);
      continue;
    }

    if (character === openCharacter) {
      depth += 1;
    } else if (character === closeCharacter) {
      depth -= 1;

      if (depth === 0) {
        return {
          end: index,
          inner: source.slice(startIndex + 1, index)
        };
      }
    }

    index += 1;
  }

  throw new Error(`Unbalanced ${openCharacter}${closeCharacter} starting at ${startIndex}`);
}

const skipWhitespaceAndComments = (source, startIndex) => {
  let index = startIndex;

  while (index < source.length) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    if (character === '/' && nextCharacter === '/') {
      index = skipLineComment(source, index);
      continue;
    }

    if (character === '/' && nextCharacter === '*') {
      index = skipBlockComment(source, index);
      continue;
    }

    break;
  }

  return index;
};

const readIdentifier = (source, startIndex) => {
  let index = startIndex;

  while (index < source.length && isIdentifierCharacter(source[index])) {
    index += 1;
  }

  return {
    end: index,
    name: source.slice(startIndex, index)
  };
};

const parseQuotedString = (source, startIndex) => {
  const quoteCharacter = source[startIndex];

  if (quoteCharacter !== '\'' && quoteCharacter !== '"') {
    return null;
  }

  let value = '';
  let index = startIndex + 1;

  while (index < source.length) {
    const character = source[index];

    if (character === '\\') {
      value += source[index + 1] ?? '';
      index += 2;
      continue;
    }

    if (character === quoteCharacter) {
      return {
        end: index + 1,
        value
      };
    }

    value += character;
    index += 1;
  }

  return null;
};

const parseStringList = (expression) => {
  const values = [];
  let index = 0;

  while (index < expression.length) {
    while (index < expression.length && /\s/.test(expression[index])) {
      index += 1;
    }

    if (index >= expression.length) {
      return values;
    }

    const parsedString = parseQuotedString(expression, index);

    if (!parsedString) {
      return null;
    }

    values.push(parsedString.value);
    index = parsedString.end;

    while (index < expression.length && /\s/.test(expression[index])) {
      index += 1;
    }

    if (index >= expression.length) {
      return values;
    }

    if (expression[index] !== ',') {
      return null;
    }

    index += 1;
  }

  return values;
};

const previousMeaningfulCharacter = (source, startIndex) => {
  let index = startIndex;

  while (index >= 0) {
    if (!/\s/.test(source[index])) {
      return source[index];
    }

    index -= 1;
  }

  return '';
};

const isRegexLiteralStart = (source, index) =>
  source[index] === '/' &&
  source[index + 1] !== '/' &&
  source[index + 1] !== '*' &&
  regexPrefixCharacters.has(previousMeaningfulCharacter(source, index - 1));

const extractModulesFromSource = (source, relativeFilePath) => {
  const modules = [];
  const lineStarts = buildLineStarts(source);
  let index = 0;

  while (index < source.length) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (isRegexLiteralStart(source, index)) {
      index = skipRegexLiteral(source, index);
      continue;
    }

    if (character === '/' && nextCharacter === '/') {
      index = skipLineComment(source, index);
      continue;
    }

    if (character === '/' && nextCharacter === '*') {
      index = skipBlockComment(source, index);
      continue;
    }

    if (character === '\'' || character === '"' || character === '`') {
      index = skipString(source, index, character);
      continue;
    }

    if (source.startsWith('ig.module', index)) {
      const previousCharacter = previousMeaningfulCharacter(source, index - 1);

      if (previousCharacter && (previousCharacter === '"' || previousCharacter === '\'' || previousCharacter === '`')) {
        index += 1;
        continue;
      }

      let cursor = skipWhitespaceAndComments(source, index + 'ig.module'.length);

      if (source[cursor] !== '(') {
        index += 1;
        continue;
      }

      const moduleArguments = skipBalanced(source, cursor, '(', ')');
      const moduleNameList = parseStringList(moduleArguments.inner);
      const moduleName = moduleNameList && moduleNameList.length === 1
        ? moduleNameList[0]
        : null;
      const record = {
        definesLine: null,
        dynamicRequiresExpression: null,
        file: relativeFilePath,
        line: getLineNumber(lineStarts, index),
        moduleName: moduleName ?? normalizeWhitespace(moduleArguments.inner),
        moduleNameIsStatic: Boolean(moduleName),
        requires: [],
        requiresLine: null,
        requiresMode: 'none'
      };

      cursor = moduleArguments.end + 1;

      while (cursor < source.length) {
        cursor = skipWhitespaceAndComments(source, cursor);

        if (source[cursor] !== '.') {
          break;
        }

        const methodStart = cursor;
        const { end, name } = readIdentifier(source, cursor + 1);

        if (!name) {
          break;
        }

        cursor = skipWhitespaceAndComments(source, end);

        if (name === 'requires') {
          record.requiresLine = getLineNumber(lineStarts, methodStart);
          let requiresMode = 'static';

          if (source[cursor] === '.') {
            const secondary = readIdentifier(source, cursor + 1);

            if (secondary.name === 'apply') {
              requiresMode = 'apply';
              cursor = skipWhitespaceAndComments(source, secondary.end);
            }
          }

          if (source[cursor] !== '(') {
            break;
          }

          const requiresArguments = skipBalanced(source, cursor, '(', ')');
          const staticRequires = requiresMode === 'static'
            ? parseStringList(requiresArguments.inner)
            : null;

          if (staticRequires) {
            record.requires = staticRequires;
            record.requiresMode = 'static';
          } else if (requiresMode === 'apply') {
            record.requiresMode = 'apply';
            record.dynamicRequiresExpression = normalizeWhitespace(requiresArguments.inner);
          } else {
            record.requiresMode = 'expression';
            record.dynamicRequiresExpression = normalizeWhitespace(requiresArguments.inner);
          }

          cursor = requiresArguments.end + 1;
          continue;
        }

        if (name === 'defines') {
          record.definesLine = getLineNumber(lineStarts, methodStart);

          if (source[cursor] === '(') {
            const definesArguments = skipBalanced(source, cursor, '(', ')');
            cursor = definesArguments.end + 1;
          }

          continue;
        }

        if (source[cursor] === '(') {
          const skippedCall = skipBalanced(source, cursor, '(', ')');
          cursor = skippedCall.end + 1;
          continue;
        }

        break;
      }

      modules.push(record);
      index = moduleArguments.end + 1;
      continue;
    }

    index += 1;
  }

  return modules;
};

const collectSourceFiles = async (directory) => {
  const collected = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      collected.push(...await collectSourceFiles(absolutePath));
      continue;
    }

    if (scannedExtensions.has(path.extname(entry.name))) {
      collected.push(absolutePath);
    }
  }

  return collected;
};

const relativePath = (absolutePath) => path.relative(repoRoot, absolutePath).replaceAll(path.sep, '/');

const buildGraph = (modules, filesScanned) => {
  const modulesByName = new Map();
  const duplicateDefinitions = new Map();
  const edges = [];

  for (const module of modules) {
    if (!modulesByName.has(module.moduleName)) {
      modulesByName.set(module.moduleName, []);
    }

    modulesByName.get(module.moduleName).push(module);

    if (module.requiresMode === 'static') {
      for (const dependency of module.requires) {
        edges.push({
          from: module.moduleName,
          to: dependency
        });
      }
    }
  }

  for (const [name, definitions] of modulesByName.entries()) {
    if (definitions.length > 1) {
      duplicateDefinitions.set(name, definitions);
    }
  }

  const incomingCounts = new Map();
  const outgoingCounts = new Map();

  for (const module of modules) {
    incomingCounts.set(module.moduleName, 0);
    outgoingCounts.set(module.moduleName, module.requiresMode === 'static' ? module.requires.length : 0);
  }

  for (const edge of edges) {
    if (incomingCounts.has(edge.to)) {
      incomingCounts.set(edge.to, incomingCounts.get(edge.to) + 1);
    }
  }

  const unresolvedDependencies = new Map();

  for (const edge of edges) {
    if (!modulesByName.has(edge.to)) {
      if (!unresolvedDependencies.has(edge.to)) {
        unresolvedDependencies.set(edge.to, new Set());
      }

      unresolvedDependencies.get(edge.to).add(edge.from);
    }
  }

  const roots = modules
    .filter((module) => incomingCounts.get(module.moduleName) === 0)
    .map((module) => module.moduleName)
    .sort();
  const leaves = modules
    .filter((module) => outgoingCounts.get(module.moduleName) === 0)
    .map((module) => module.moduleName)
    .sort();

  return {
    duplicateDefinitions: [...duplicateDefinitions.entries()]
      .map(([name, definitions]) => ({
        definitions: definitions.map((definition) => ({
          file: definition.file,
          line: definition.line
        })),
        name
      }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    edges: edges.sort((left, right) =>
      left.from.localeCompare(right.from) || left.to.localeCompare(right.to)
    ),
    filesScanned,
    leaves,
    modules,
    roots,
    unresolvedDependencies: [...unresolvedDependencies.entries()]
      .map(([name, requiredBy]) => ({
        name,
        requiredBy: [...requiredBy].sort()
      }))
      .sort((left, right) => left.name.localeCompare(right.name))
  };
};

const toMarkdown = (graph) => {
  const lines = [];
  const dynamicModules = graph.modules.filter((module) => module.requiresMode !== 'static' && module.requiresMode !== 'none');
  const modulesWithoutStaticDependencies = graph.modules.filter((module) => module.requiresMode === 'none');

  lines.push('# Module Graph');
  lines.push('');
  lines.push('Generated by `npm run module-graph`.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- JS files scanned: ${graph.filesScanned}`);
  lines.push(`- Modules found: ${graph.modules.length}`);
  lines.push(`- Static dependency edges: ${graph.edges.length}`);
  lines.push(`- Modules with dynamic or expression-based requires: ${dynamicModules.length}`);
  lines.push(`- Unresolved static dependencies: ${graph.unresolvedDependencies.length}`);
  lines.push(`- Duplicate module names: ${graph.duplicateDefinitions.length}`);
  lines.push('');
  lines.push('## Root Modules (Static Graph)');
  lines.push('');

  for (const moduleName of graph.roots) {
    lines.push(`- \`${moduleName}\``);
  }

  lines.push('');
  lines.push('## Leaf Modules (Static Graph)');
  lines.push('');

  for (const moduleName of graph.leaves) {
    lines.push(`- \`${moduleName}\``);
  }

  lines.push('');
  lines.push('## Unresolved Static Dependencies');
  lines.push('');

  if (graph.unresolvedDependencies.length === 0) {
    lines.push('- None');
  } else {
    for (const dependency of graph.unresolvedDependencies) {
      lines.push(`- \`${dependency.name}\` required by ${dependency.requiredBy.map((name) => `\`${name}\``).join(', ')}`);
    }
  }

  lines.push('');
  lines.push('## Dynamic Requires');
  lines.push('');

  if (dynamicModules.length === 0) {
    lines.push('- None');
  } else {
    for (const module of dynamicModules) {
      lines.push(`- \`${module.moduleName}\` in \`${module.file}:${module.line}\` uses \`${module.requiresMode}\` with \`${module.dynamicRequiresExpression}\``);
    }
  }

  lines.push('');
  lines.push('## Modules Without Static Dependencies');
  lines.push('');

  for (const module of modulesWithoutStaticDependencies) {
    lines.push(`- \`${module.moduleName}\` in \`${module.file}:${module.line}\``);
  }

  lines.push('');
  lines.push('## Module Inventory');
  lines.push('');
  lines.push('| Module | File | Requires | Mode |');
  lines.push('| --- | --- | --- | --- |');

  for (const module of graph.modules) {
    const requiresCell = module.requiresMode === 'static'
      ? (module.requires.length ? module.requires.map((dependency) => `\`${dependency}\``).join(', ') : 'None')
      : module.requiresMode === 'none'
        ? 'None'
        : `\`${module.dynamicRequiresExpression}\``;

    lines.push(`| \`${module.moduleName}\` | \`${module.file}:${module.line}\` | ${requiresCell} | \`${module.requiresMode}\` |`);
  }

  return `${lines.join('\n')}\n`;
};

const main = async () => {
  const absoluteFiles = await collectSourceFiles(repoRoot);
  const filesScanned = absoluteFiles.length;
  const modules = [];

  for (const absoluteFilePath of absoluteFiles.sort()) {
    const source = await readFile(absoluteFilePath, 'utf8');
    const filePath = relativePath(absoluteFilePath);

    try {
      modules.push(...extractModulesFromSource(source, filePath));
    } catch (error) {
      error.message = `${filePath}: ${error.message}`;
      throw error;
    }
  }

  modules.sort((left, right) =>
    left.moduleName.localeCompare(right.moduleName) ||
    left.file.localeCompare(right.file) ||
    left.line - right.line
  );

  const graph = buildGraph(modules, filesScanned);
  const jsonOutput = {
    generatedAt: new Date().toISOString(),
    roots: graph.roots,
    leaves: graph.leaves,
    filesScanned: graph.filesScanned,
    modulesFound: graph.modules.length,
    staticEdgesFound: graph.edges.length,
    unresolvedDependencies: graph.unresolvedDependencies,
    duplicateDefinitions: graph.duplicateDefinitions,
    modules: graph.modules,
    edges: graph.edges
  };

  await mkdir(docsDir, { recursive: true });
  await writeFile(outputJsonPath, `${JSON.stringify(jsonOutput, null, 2)}\n`);
  await writeFile(outputMarkdownPath, toMarkdown(graph));

  console.log(`Wrote ${relativePath(outputJsonPath)} and ${relativePath(outputMarkdownPath)}`);
  console.log(`Scanned ${filesScanned} JS files and found ${modules.length} modules.`);
};

await main();
