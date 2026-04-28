const LEVEL_JSON_PATTERN = /\/\*JSON\[\*\/([\s\S]*?)\/\*\]JSON\*\//;
const DEFAULT_OUTPUT_FORMAT = 'esm';
const ESM_LEVEL_IMPORT_PATTERN = /^\s*import\s+ig\s+from\s+['"][^'"]+['"]\s*;?/m;
const ESM_LEVEL_REGISTER_PATTERN = /\big\.Game\.registerLevel\(/;
const ESM_LEVEL_EXPORT_PATTERN = /^\s*export\s*\{/m;

const normalizePosixPath = (value = '') =>
  String(value ?? '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/');

const getDirName = (filePath = '') => {
  const normalizedPath = normalizePosixPath(filePath);
  const lastSlashIndex = normalizedPath.lastIndexOf('/');
  return lastSlashIndex === -1 ? '' : normalizedPath.slice(0, lastSlashIndex);
};

const getExtension = (filePath = '') => {
  const normalizedPath = normalizePosixPath(filePath);
  const fileName = normalizedPath.slice(normalizedPath.lastIndexOf('/') + 1);
  const extensionIndex = fileName.lastIndexOf('.');
  return extensionIndex === -1 ? '' : fileName.slice(extensionIndex).toLowerCase();
};

const getBaseName = (filePath = '') => {
  const normalizedPath = normalizePosixPath(filePath);
  const fileName = normalizedPath.slice(normalizedPath.lastIndexOf('/') + 1);
  const extension = getExtension(fileName);
  return extension ? fileName.slice(0, -extension.length) : fileName;
};

const toRelativePosixPath = (fromPath, toPath) => {
  const fromSegments = getDirName(fromPath).split('/').filter(Boolean);
  const toSegments = normalizePosixPath(toPath).split('/').filter(Boolean);

  let commonIndex = 0;
  while (
    commonIndex < fromSegments.length &&
    commonIndex < toSegments.length &&
    fromSegments[commonIndex] === toSegments[commonIndex]
  ) {
    commonIndex += 1;
  }

  const parentSegments = new Array(fromSegments.length - commonIndex).fill('..');
  const childSegments = toSegments.slice(commonIndex);
  const relativePath = [...parentSegments, ...childSegments].join('/');

  return relativePath || '.';
};

const normalizeLevelOutputFormat = (format = DEFAULT_OUTPUT_FORMAT) => {
  switch (format) {
    case 'esm':
    case 'json':
      return format;
    default:
      throw new Error(`Unsupported Weltmeister level output format: ${format}`);
  }
};

const getLevelFileFormat = (filePath = '', fallbackFormat = DEFAULT_OUTPUT_FORMAT) => {
  const extension = getExtension(filePath);

  if (extension === '.json') {
    return 'json';
  }

  if (extension === '.js') {
    return 'esm';
  }

  return normalizeLevelOutputFormat(fallbackFormat);
};

const ensureLevelFileExtension = (filePath = '', fallbackFormat = DEFAULT_OUTPUT_FORMAT) => {
  const currentExtension = getExtension(filePath);

  if (currentExtension === '.js' || currentExtension === '.json') {
    return filePath;
  }

  const format = getLevelFileFormat(filePath, fallbackFormat);
  return `${filePath}${format === 'json' ? '.json' : '.js'}`;
};

const isEsmLevelSource = (source = '') =>
  ESM_LEVEL_IMPORT_PATTERN.test(source) &&
  ESM_LEVEL_REGISTER_PATTERN.test(source) &&
  ESM_LEVEL_EXPORT_PATTERN.test(source);

const parseLevelSource = (source) => {
  const normalizedSource = String(source ?? '').replace(/^\uFEFF/, '');
  const jsonMatch = normalizedSource.match(LEVEL_JSON_PATTERN);
  const jsonSource =
    jsonMatch && isEsmLevelSource(normalizedSource) ? jsonMatch[1] : normalizedSource;
  return JSON.parse(jsonSource);
};

const stringifyLevelData = (levelData, prettyPrint = true) =>
  prettyPrint ? JSON.stringify(levelData, null, 2) : JSON.stringify(levelData);

const unique = (values) => Array.from(new Set(values));

const collectLevelResourcePaths = (levelData = {}) =>
  unique(
    (levelData.layer ?? [])
      .map((layer) => layer?.tilesetName)
      .filter((tilesetName) => tilesetName && tilesetName !== '')
  );

const toPascalCase = (value = '') =>
  value.replace(/(^|[-_./])(\w)/g, (_match, _separator, character) =>
    character.toUpperCase()
  );

const getLevelSymbolName = (filePath) =>
  `Level${toPascalCase(getBaseName(filePath))}`;

const toImportPath = (fromFilePath, toFilePath) => {
  const relativePath = toRelativePosixPath(fromFilePath, toFilePath);
  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
};

const serializeEsmLevel = ({
  filePath,
  levelData,
  prettyPrint = true
}) => {
  const normalizedFilePath = ensureLevelFileExtension(filePath, 'esm');
  const jsonSource = stringifyLevelData(levelData, prettyPrint);
  const levelSymbolName = getLevelSymbolName(normalizedFilePath);
  const resourcePaths = collectLevelResourcePaths(levelData);
  const relativeImpactPath = toImportPath(normalizedFilePath, 'lib/impact/impact.js');
  const resourceSource = resourcePaths.length
    ? `[${resourcePaths.map((resourcePath) => `new ig.Image(${JSON.stringify(resourcePath)})`).join(', ')}]`
    : '[]';

  return [
    `import ig from ${JSON.stringify(relativeImpactPath)};`,
    '',
    `const ${levelSymbolName} = /*JSON[*/${jsonSource}/*]JSON*/;`,
    `const ${levelSymbolName}Resources = ${resourceSource};`,
    '',
    `ig.Game.registerLevel(${JSON.stringify(levelSymbolName)}, ${levelSymbolName});`,
    '',
    `export { ${levelSymbolName}, ${levelSymbolName}Resources };`,
    ''
  ].join('\n');
};

const serializeJsonLevel = ({ levelData, prettyPrint = true }) =>
  `${stringifyLevelData(levelData, prettyPrint)}\n`;

const buildLevelSave = ({
  filePath,
  levelData,
  outputFormat = DEFAULT_OUTPUT_FORMAT,
  prettyPrint = true
}) => {
  const resolvedPath = ensureLevelFileExtension(filePath, outputFormat);
  const format = getLevelFileFormat(resolvedPath, outputFormat);

  return {
    filePath: resolvedPath,
    format,
    source:
      format === 'json'
        ? serializeJsonLevel({ levelData, prettyPrint })
        : serializeEsmLevel({ filePath: resolvedPath, levelData, prettyPrint })
  };
};

export {
  DEFAULT_OUTPUT_FORMAT,
  buildLevelSave,
  collectLevelResourcePaths,
  ensureLevelFileExtension,
  getLevelFileFormat,
  getLevelSymbolName,
  normalizeLevelOutputFormat,
  parseLevelSource,
  serializeEsmLevel,
  serializeJsonLevel,
  stringifyLevelData
};
