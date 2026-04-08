import express from 'express';
import { glob } from 'node:fs/promises';
import fs from 'node:fs/promises';
import path from 'node:path';

const LEGACY_FILE_ROOT = '../../../';
const IMAGE_EXTENSIONS = new Set(['.png', '.gif', '.jpg', '.jpeg']);

const isLegacyEmpty = (value) =>
  value === undefined || value === null || value === '' || value === '0';

const normalizeSlashes = (value) => String(value ?? '').replace(/\\/g, '/');

const sanitizeLegacyPath = (value = '') =>
  normalizeSlashes(value).replace(/\.\./g, '').replace(/^\/+/, '');

const toPosixPath = (value) => value.split(path.sep).join('/');

const resolveProjectPath = (projectRoot, value = '') =>
  path.resolve(projectRoot, sanitizeLegacyPath(value));

const toLegacyErrorPath = (value = '') => {
  const sanitizedPath = sanitizeLegacyPath(value);
  return sanitizedPath ? `${LEGACY_FILE_ROOT}${sanitizedPath}` : LEGACY_FILE_ROOT;
};

const getLegacyParent = (value = '') => {
  const sanitizedPath = sanitizeLegacyPath(value);
  if (!sanitizedPath) {
    return false;
  }

  const lastSlashIndex = sanitizedPath.lastIndexOf('/');
  return sanitizedPath.slice(0, lastSlashIndex === -1 ? 0 : lastSlashIndex);
};

const getGlobPatterns = (query = {}) => {
  const values = [];

  for (const key of ['glob', 'glob[]']) {
    const currentValue = query[key];
    if (Array.isArray(currentValue)) {
      values.push(...currentValue);
    } else if (currentValue !== undefined) {
      values.push(currentValue);
    }
  }

  return values.filter((value) => !isLegacyEmpty(value));
};

const filterBrowseFiles = (name, type = '') => {
  if (name.startsWith('.')) {
    return false;
  }

  switch (type) {
    case 'images':
      return IMAGE_EXTENSIONS.has(path.extname(name));
    case 'scripts':
      return name.endsWith('.js');
    default:
      return name.includes('.');
  }
};

const listDirectoryEntries = async (targetDirectory) => {
  try {
    return await fs.readdir(targetDirectory, { withFileTypes: true });
  } catch (error) {
    if (
      error &&
      (error.code === 'ENOENT' || error.code === 'ENOTDIR' || error.code === 'EACCES')
    ) {
      return [];
    }

    throw error;
  }
};

const sortLexicographically = (values) => values.sort((left, right) => left.localeCompare(right));

const saveFile = async ({ projectRoot, filePath, data }) => {
  if (isLegacyEmpty(filePath) || isLegacyEmpty(data)) {
    return {
      error: '1',
      msg: 'No Data or Path specified'
    };
  }

  const sanitizedPath = sanitizeLegacyPath(filePath);
  if (!sanitizedPath.endsWith('.js')) {
    return {
      error: '3',
      msg: 'File must have a .js suffix'
    };
  }

  try {
    await fs.writeFile(resolveProjectPath(projectRoot, sanitizedPath), data, 'utf8');
    return { error: 0 };
  } catch {
    return {
      error: '2',
      msg: `Couldn't write to file: ${toLegacyErrorPath(sanitizedPath)}`
    };
  }
};

const browseFiles = async ({ projectRoot, dir = '', type = '' }) => {
  const sanitizedDir = sanitizeLegacyPath(dir);
  const targetDirectory = resolveProjectPath(projectRoot, sanitizedDir);
  const entries = await listDirectoryEntries(targetDirectory);

  const dirs = [];
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const relativePath = toPosixPath(
      path.relative(projectRoot, path.join(targetDirectory, entry.name))
    );

    if (entry.isDirectory()) {
      dirs.push(relativePath);
      continue;
    }

    if (entry.isFile() && filterBrowseFiles(entry.name, type)) {
      files.push(relativePath);
    }
  }

  return {
    parent: getLegacyParent(sanitizedDir),
    dirs: sortLexicographically(dirs),
    files: sortLexicographically(files)
  };
};

const globFiles = async ({ projectRoot, patterns = [] }) => {
  const files = [];

  for (const pattern of patterns) {
    const sanitizedPattern = sanitizeLegacyPath(pattern);
    if (!sanitizedPattern) {
      continue;
    }

    const currentFiles = [];
    for await (const match of glob(sanitizedPattern, { cwd: projectRoot })) {
      currentFiles.push(toPosixPath(match));
    }

    sortLexicographically(currentFiles);
    files.push(...currentFiles);
  }

  return files;
};

const createJsonResponder =
  (handler) =>
  async (req, res, next) => {
    try {
      res.json(await handler(req));
    } catch (error) {
      next(error);
    }
  };

const createWeltmeisterApiRouter = ({ projectRoot }) => {
  const router = express.Router();
  const urlencodedParser = express.urlencoded({ extended: false });

  router.all(
    '/save.php',
    urlencodedParser,
    createJsonResponder((req) =>
      saveFile({
        projectRoot,
        filePath: req.body?.path,
        data: req.body?.data
      })
    )
  );

  router.all(
    '/browse.php',
    createJsonResponder((req) =>
      browseFiles({
        projectRoot,
        dir: req.query?.dir,
        type: req.query?.type
      })
    )
  );

  router.all(
    '/glob.php',
    createJsonResponder((req) =>
      globFiles({
        projectRoot,
        patterns: getGlobPatterns(req.query)
      })
    )
  );

  return router;
};

export {
  browseFiles,
  createWeltmeisterApiRouter,
  getGlobPatterns,
  globFiles,
  sanitizeLegacyPath,
  saveFile
};
