import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  browseFiles,
  saveImageFile,
  saveFile
} from '../tools/weltmeister/api/node-api.mjs';

const ONE_BY_ONE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HwAGgwJ/lbn4WQAAAABJRU5ErkJggg==';
const ONE_BY_ONE_PNG_DATA_URL = `data:image/png;base64,${ONE_BY_ONE_PNG_BASE64}`;
const ONE_BY_ONE_PNG_BUFFER = Buffer.from(ONE_BY_ONE_PNG_BASE64, 'base64');

const makeTempProjectRoot = async () =>
  fs.mkdtemp(path.join(os.tmpdir(), 'theseus-weltmeister-api-'));

const writeProjectFile = async (projectRoot, relativePath, contents = '') => {
  const targetPath = path.join(projectRoot, relativePath);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, contents, 'utf8');
  return targetPath;
};

test('saveFile writes .js files relative to the configured project root', async (t) => {
  const projectRoot = await makeTempProjectRoot();
  t.after(() => fs.rm(projectRoot, { recursive: true, force: true }));

  await fs.mkdir(path.join(projectRoot, 'lib/game/levels'), { recursive: true });

  const result = await saveFile({
    projectRoot,
    filePath: 'lib/game/levels/test-level.js',
    data: 'export default 1;\n'
  });

  assert.deepEqual(result, { error: 0 });
  assert.equal(
    await fs.readFile(path.join(projectRoot, 'lib/game/levels/test-level.js'), 'utf8'),
    'export default 1;\n'
  );
});

test('saveFile writes .json files relative to the configured project root', async (t) => {
  const projectRoot = await makeTempProjectRoot();
  t.after(() => fs.rm(projectRoot, { recursive: true, force: true }));

  await fs.mkdir(path.join(projectRoot, 'lib/game/levels'), { recursive: true });

  const data = '{\n  "entities": [],\n  "layer": []\n}\n';
  const result = await saveFile({
    projectRoot,
    filePath: 'lib/game/levels/test-level.json',
    data
  });

  assert.deepEqual(result, { error: 0 });
  assert.equal(
    await fs.readFile(path.join(projectRoot, 'lib/game/levels/test-level.json'), 'utf8'),
    data
  );
});

test('saveFile strips traversal markers but keeps writes rooted inside the project', async (t) => {
  const projectRoot = await makeTempProjectRoot();
  const sandboxRoot = path.dirname(projectRoot);
  t.after(() => fs.rm(projectRoot, { recursive: true, force: true }));

  await fs.mkdir(path.join(projectRoot, 'lib/game/levels'), { recursive: true });

  const result = await saveFile({
    projectRoot,
    filePath: '../lib/game/levels/safe.js',
    data: 'safe = true;\n'
  });

  assert.deepEqual(result, { error: 0 });
  assert.equal(
    await fs.readFile(path.join(projectRoot, 'lib/game/levels/safe.js'), 'utf8'),
    'safe = true;\n'
  );
  await assert.rejects(fs.access(path.join(sandboxRoot, 'lib/game/levels/safe.js')));
});

test('saveFile preserves the .js/.json level suffix constraint', async (t) => {
  const projectRoot = await makeTempProjectRoot();
  t.after(() => fs.rm(projectRoot, { recursive: true, force: true }));

  const result = await saveFile({
    projectRoot,
    filePath: 'lib/game/levels/not-allowed.txt',
    data: '{}'
  });

  assert.deepEqual(result, {
    error: '3',
    msg: 'File must have a .js or .json suffix'
  });
});

test('saveImageFile writes valid PNG files inside media', async (t) => {
  const projectRoot = await makeTempProjectRoot();
  t.after(() => fs.rm(projectRoot, { recursive: true, force: true }));

  const result = await saveImageFile({
    projectRoot,
    filePath: 'media/generated/test.font.png',
    data: ONE_BY_ONE_PNG_DATA_URL
  });

  assert.deepEqual(result, {
    error: 0,
    path: 'media/generated/test.font.png'
  });
  assert.deepEqual(
    await fs.readFile(path.join(projectRoot, 'media/generated/test.font.png')),
    ONE_BY_ONE_PNG_BUFFER
  );
});

test('saveImageFile rejects writes outside media', async (t) => {
  const projectRoot = await makeTempProjectRoot();
  t.after(() => fs.rm(projectRoot, { recursive: true, force: true }));

  const result = await saveImageFile({
    projectRoot,
    filePath: 'lib/game/generated.font.png',
    data: ONE_BY_ONE_PNG_DATA_URL
  });

  assert.deepEqual(result, {
    error: '4',
    msg: 'Image path must stay inside media/'
  });
});

test('browseFiles returns image and script listings for Weltmeister pickers', async (t) => {
  const projectRoot = await makeTempProjectRoot();
  t.after(() => fs.rm(projectRoot, { recursive: true, force: true }));

  await writeProjectFile(projectRoot, 'media/hero.png');
  await writeProjectFile(projectRoot, 'media/readme.txt');
  await writeProjectFile(projectRoot, 'media/.hidden.png');
  await writeProjectFile(projectRoot, 'media/scripts/player.js');
  await writeProjectFile(projectRoot, 'media/scripts/player.json');
  await fs.mkdir(path.join(projectRoot, 'media/backgrounds'), { recursive: true });

  assert.deepEqual(
    await browseFiles({
      projectRoot,
      dir: 'media',
      type: 'images'
    }),
    {
      parent: '',
      dirs: ['media/backgrounds', 'media/scripts'],
      files: ['media/hero.png']
    }
  );

  assert.deepEqual(
    await browseFiles({
      projectRoot,
      dir: 'media/scripts',
      type: 'scripts'
    }),
    {
      parent: 'media',
      dirs: [],
      files: ['media/scripts/player.js', 'media/scripts/player.json']
    }
  );
});
