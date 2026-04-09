import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';

const LEGACY_FILE_ROOT = '../../../';
const IMAGE_EXTENSIONS = new Set(['.png', '.gif', '.jpg', '.jpeg']);
const MEDIA_ROOT = 'media/';
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WELTMEISTER_SAVE_BODY_LIMIT = '10mb';

const isLegacyEmpty = (value) =>
  value === undefined || value === null || value === '' || value === '0';

const normalizeSlashes = (value) => String(value ?? '').replace(/\\/g, '/');

const sanitizeLegacyPath = (value = '') =>
  normalizeSlashes(value).replace(/\.\./g, '').replace(/^\/+/, '');

const toPosixPath = (value) => value.split(path.sep).join('/');

const resolveProjectPath = (projectRoot, value = '') =>
  path.resolve(projectRoot, sanitizeLegacyPath(value));

const normalizeRelativePath = (value = '') => {
  const sanitizedPath = sanitizeLegacyPath(value);
  const normalizedPath = path.posix.normalize(sanitizedPath || '.');

  if (normalizedPath === '.') {
    return '';
  }

  return normalizedPath.replace(/^\/+/, '').replace(/^\.\//, '');
};

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

const filterBrowseFiles = (name, type = '') => {
  if (name.startsWith('.')) {
    return false;
  }

  switch (type) {
    case 'images':
      return IMAGE_EXTENSIONS.has(path.extname(name));
    case 'scripts':
      return name.endsWith('.js') || name.endsWith('.json');
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
  if (!sanitizedPath.endsWith('.js') && !sanitizedPath.endsWith('.json')) {
    return {
      error: '3',
      msg: 'File must have a .js or .json suffix'
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

const decodeBase64Png = (value = '') => {
  const normalizedValue = String(value).trim().replace(/^data:image\/png;base64,/i, '');

  if (!normalizedValue) {
    return null;
  }

  const buffer = Buffer.from(normalizedValue, 'base64');

  if (
    buffer.length < PNG_SIGNATURE.length ||
    !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  ) {
    return null;
  }

  return buffer;
};

const saveImageFile = async ({ projectRoot, filePath, data }) => {
  if (isLegacyEmpty(filePath) || isLegacyEmpty(data)) {
    return {
      error: '1',
      msg: 'No Data or Path specified'
    };
  }

  const sanitizedPath = normalizeRelativePath(filePath);
  const normalizedPath = sanitizedPath.toLowerCase();

  if (!normalizedPath.endsWith('.png')) {
    return {
      error: '3',
      msg: 'File must have a .png suffix'
    };
  }

  if (!normalizedPath.startsWith(MEDIA_ROOT)) {
    return {
      error: '4',
      msg: 'Image path must stay inside media/'
    };
  }

  const buffer = decodeBase64Png(data);
  if (!buffer) {
    return {
      error: '5',
      msg: 'Image data must be base64-encoded PNG data'
    };
  }

  try {
    const targetPath = resolveProjectPath(projectRoot, sanitizedPath);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, buffer);
    return {
      error: 0,
      path: sanitizedPath
    };
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

const createJsonResponder =
  (handler) =>
  async (req, res, next) => {
    try {
      res.json(await handler(req));
    } catch (error) {
      next(error);
    }
  };

const getSaveRouteErrorStatus = (saveResult) =>
  saveResult.error === '2' ? 500 : 400;

const createWeltmeisterApiRouter = ({ projectRoot }) => {
  const router = express.Router();
  const saveBodyParser = express.json({ limit: WELTMEISTER_SAVE_BODY_LIMIT });

  router.post('/save', saveBodyParser, async (req, res, next) => {
    try {
      const saveResult = await saveFile({
        projectRoot,
        filePath: req.body?.path,
        data: req.body?.data
      });

      if (saveResult.error) {
        res.status(getSaveRouteErrorStatus(saveResult)).json({ error: saveResult.msg });
        return;
      }

      res.status(200).json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.post('/save-image', saveBodyParser, async (req, res, next) => {
    try {
      const saveResult = await saveImageFile({
        projectRoot,
        filePath: req.body?.path,
        data: req.body?.data
      });

      if (saveResult.error) {
        res.status(getSaveRouteErrorStatus(saveResult)).json({ error: saveResult.msg });
        return;
      }

      res.status(200).json({ ok: true, path: saveResult.path });
    } catch (error) {
      next(error);
    }
  });

  router.all(
    '/browse',
    createJsonResponder((req) =>
      browseFiles({
        projectRoot,
        dir: req.query?.dir,
        type: req.query?.type
      })
    )
  );

  return router;
};

export {
  browseFiles,
  createWeltmeisterApiRouter,
  saveImageFile,
  sanitizeLegacyPath,
  saveFile
};
