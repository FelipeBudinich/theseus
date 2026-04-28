import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const sourceRootNames = ['lib', 'tools/weltmeister'];
const sourceRoots = sourceRootNames.map((sourceRoot) => path.join(repoRoot, sourceRoot));
const docsDir = path.join(repoRoot, 'docs');
const outputJsonPath = path.join(docsDir, 'module-graph.json');
const outputMarkdownPath = path.join(docsDir, 'module-graph.md');
const scannedExtensions = new Set(['.js', '.mjs']);

const toPosixPath = (value) => value.split(path.sep).join('/');
const relativeToRepo = (value) => toPosixPath(path.relative(repoRoot, value));
const compareStrings = (left, right) => left.localeCompare(right);

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

const shouldScanFile = (name) =>
  scannedExtensions.has(path.extname(name)) && !name.endsWith('.min.js');

const listJavaScriptFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listJavaScriptFiles(fullPath)));
      continue;
    }

    if (shouldScanFile(entry.name)) {
      files.push(fullPath);
    }
  }

  return files.sort(compareStrings);
};

const toModuleName = (filePath) => {
  const relativePath = relativeToRepo(filePath).replace(/\.(?:js|mjs)$/, '');
  return relativePath.replace(/^lib\//, '');
};

const resolveRelativeSpecifier = (filePath, specifier) => {
  if (!specifier.startsWith('.')) {
    return null;
  }

  return relativeToRepo(path.resolve(path.dirname(filePath), specifier));
};

const getStaticImports = (source) => {
  const imports = [];
  const importExpression =
    /^\s*import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]\s*;?/gm;
  let match = importExpression.exec(source);

  while (match) {
    imports.push({
      specifier: match[1],
      index: match.index
    });
    match = importExpression.exec(source);
  }

  return imports;
};

const getDynamicImportSites = (source) => {
  const sites = [];
  const importExpression = /\bimport\s*\(/g;
  let match = importExpression.exec(source);

  while (match) {
    sites.push({ index: match.index });
    match = importExpression.exec(source);
  }

  return sites;
};

const readModuleRecord = async (filePath) => {
  const source = await readFile(filePath, 'utf8');
  const lineStarts = buildLineStarts(source);

  return {
    file: relativeToRepo(filePath),
    filePath,
    moduleName: toModuleName(filePath),
    staticImports: getStaticImports(source).map((entry) => ({
      line: getLineNumber(lineStarts, entry.index),
      specifier: entry.specifier,
      resolvedFile: resolveRelativeSpecifier(filePath, entry.specifier)
    })),
    dynamicImports: getDynamicImportSites(source).map((entry) => ({
      line: getLineNumber(lineStarts, entry.index),
      expression: 'expression-based import(...)'
    }))
  };
};

const buildGraph = async () => {
  const files = (await Promise.all(sourceRoots.map(listJavaScriptFiles)))
    .flat()
    .sort(compareStrings);
  const modules = await Promise.all(files.map(readModuleRecord));
  const moduleByFile = new Map(modules.map((moduleRecord) => [moduleRecord.file, moduleRecord]));
  const incomingEdges = new Map(modules.map((moduleRecord) => [moduleRecord.moduleName, new Set()]));
  const unresolvedByName = new Map();
  let staticEdgesFound = 0;

  const normalizedModules = modules.map((moduleRecord) => {
    const staticDependencies = [];

    for (const importEntry of moduleRecord.staticImports) {
      const resolvedModule = importEntry.resolvedFile
        ? moduleByFile.get(importEntry.resolvedFile)
        : null;

      if (resolvedModule) {
        staticDependencies.push({
          file: resolvedModule.file,
          line: importEntry.line,
          moduleName: resolvedModule.moduleName,
          specifier: importEntry.specifier
        });
        incomingEdges.get(resolvedModule.moduleName)?.add(moduleRecord.moduleName);
        staticEdgesFound += 1;
        continue;
      }

      if (!importEntry.resolvedFile) {
        continue;
      }

      const unresolvedName = importEntry.resolvedFile.replace(/\.js$/, '');
      const existingEntry = unresolvedByName.get(unresolvedName);

      if (existingEntry) {
        existingEntry.requiredBy.push(moduleRecord.moduleName);
      } else {
        unresolvedByName.set(unresolvedName, {
          name: unresolvedName,
          requiredBy: [moduleRecord.moduleName]
        });
      }
    }

    return {
      dynamicImports: moduleRecord.dynamicImports,
      file: moduleRecord.file,
      imports: staticDependencies.sort((left, right) => compareStrings(left.moduleName, right.moduleName)),
      moduleName: moduleRecord.moduleName
    };
  });

  normalizedModules.sort((left, right) => compareStrings(left.moduleName, right.moduleName));

  const roots = normalizedModules
    .filter((moduleRecord) => (incomingEdges.get(moduleRecord.moduleName)?.size ?? 0) === 0)
    .map((moduleRecord) => moduleRecord.moduleName)
    .sort(compareStrings);

  const leaves = normalizedModules
    .filter((moduleRecord) => moduleRecord.imports.length === 0)
    .map((moduleRecord) => moduleRecord.moduleName)
    .sort(compareStrings);

  const modulesWithoutStaticImports = normalizedModules
    .filter((moduleRecord) => moduleRecord.imports.length === 0)
    .map((moduleRecord) => ({
      file: moduleRecord.file,
      moduleName: moduleRecord.moduleName
    }));

  const dynamicImports = normalizedModules
    .flatMap((moduleRecord) =>
      moduleRecord.dynamicImports.map((dynamicImport) => ({
        ...dynamicImport,
        file: moduleRecord.file,
        moduleName: moduleRecord.moduleName
      }))
    )
    .sort((left, right) =>
      compareStrings(`${left.file}:${left.line}`, `${right.file}:${right.line}`)
    );

  const unresolvedDependencies = [...unresolvedByName.values()]
    .map((entry) => ({
      name: entry.name,
      requiredBy: [...new Set(entry.requiredBy)].sort(compareStrings)
    }))
    .sort((left, right) => compareStrings(left.name, right.name));

  return {
    duplicateDefinitions: [],
    dynamicImports,
    filesScanned: normalizedModules.length,
    generatedAt: new Date().toISOString(),
    leaves,
    modules: normalizedModules,
    modulesFound: normalizedModules.length,
    roots,
    sourceRoots: sourceRootNames,
    staticEdgesFound,
    unresolvedDependencies,
    modulesWithoutStaticImports
  };
};

const toMarkdown = (graph) => {
  const lines = [];

  lines.push('# Module Graph');
  lines.push('');
  lines.push('Generated by `npm run module-graph`.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(
    `- Source roots: ${graph.sourceRoots.map((sourceRoot) => `\`${sourceRoot}/\``).join(', ')}`
  );
  lines.push(`- JS files scanned: ${graph.filesScanned}`);
  lines.push(`- Modules found: ${graph.modulesFound}`);
  lines.push(`- Static import edges: ${graph.staticEdgesFound}`);
  lines.push(`- Modules with dynamic import sites: ${graph.dynamicImports.length}`);
  lines.push(`- Unresolved relative imports: ${graph.unresolvedDependencies.length}`);
  lines.push('');
  lines.push('## Root Modules (Static Graph)');
  lines.push('');
  lines.push(...graph.roots.map((moduleName) => `- \`${moduleName}\``));
  lines.push('');
  lines.push('## Leaf Modules (Static Graph)');
  lines.push('');
  lines.push(...graph.leaves.map((moduleName) => `- \`${moduleName}\``));
  lines.push('');
  lines.push('## Unresolved Relative Imports');
  lines.push('');

  if (graph.unresolvedDependencies.length === 0) {
    lines.push('- None');
  } else {
    lines.push(
      ...graph.unresolvedDependencies.map(
        (dependency) => `- \`${dependency.name}\` required by ${dependency.requiredBy.map((name) => `\`${name}\``).join(', ')}`
      )
    );
  }

  lines.push('');
  lines.push('## Dynamic Import Sites');
  lines.push('');

  if (graph.dynamicImports.length === 0) {
    lines.push('- None');
  } else {
    lines.push(
      ...graph.dynamicImports.map(
        (entry) => `- \`${entry.moduleName}\` in \`${entry.file}:${entry.line}\` uses ${entry.expression}`
      )
    );
  }

  lines.push('');
  lines.push('## Modules Without Static Imports');
  lines.push('');
  lines.push(
    ...graph.modulesWithoutStaticImports.map(
      (entry) => `- \`${entry.moduleName}\` in \`${entry.file}\``
    )
  );
  lines.push('');
  lines.push('## Module Inventory');
  lines.push('');
  lines.push('| Module | File | Imports | Dynamic |');
  lines.push('| --- | --- | --- | --- |');

  for (const moduleRecord of graph.modules) {
    lines.push(
      `| \`${moduleRecord.moduleName}\` | \`${moduleRecord.file}\` | ${
        moduleRecord.imports.length
          ? moduleRecord.imports.map((entry) => `\`${entry.moduleName}\``).join(', ')
          : 'None'
      } | ${moduleRecord.dynamicImports.length ? '`yes`' : '`no`'} |`
    );
  }

  lines.push('');
  return lines.join('\n');
};

const main = async () => {
  const graph = await buildGraph();

  await mkdir(docsDir, { recursive: true });
  await writeFile(outputJsonPath, `${JSON.stringify(graph, null, 2)}\n`);
  await writeFile(outputMarkdownPath, toMarkdown(graph));

  console.log(
    `Wrote ${relativeToRepo(outputJsonPath)} and ${relativeToRepo(outputMarkdownPath)}`
  );
};

await main();
