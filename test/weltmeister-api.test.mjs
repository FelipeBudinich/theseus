import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  browseFiles,
  getGlobPatterns,
  getWeltmeisterUrlencodedOptions,
  globFiles,
  saveFile,
  WELTMEISTER_URLENCODED_LIMIT
} from '../lib/weltmeister/api/node-api.mjs';

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

  const result = await saveFile({
    projectRoot,
    filePath: 'lib/game/levels/test-level.json',
    data: '{\n  "entities": [],\n  "layer": []\n}\n'
  });

  assert.deepEqual(result, { error: 0 });
  assert.equal(
    await fs.readFile(path.join(projectRoot, 'lib/game/levels/test-level.json'), 'utf8'),
    '{\n  "entities": [],\n  "layer": []\n}\n'
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

test('browseFiles returns parent, directory, and file lists with legacy filtering', async (t) => {
  const projectRoot = await makeTempProjectRoot();
  t.after(() => fs.rm(projectRoot, { recursive: true, force: true }));

  await writeProjectFile(projectRoot, 'media/hero.png');
  await writeProjectFile(projectRoot, 'media/readme.txt');
  await writeProjectFile(projectRoot, 'media/.hidden.png');
  await writeProjectFile(projectRoot, 'media/scripts/player.js');
  await writeProjectFile(projectRoot, 'media/scripts/player.json');
  await fs.mkdir(path.join(projectRoot, 'media/backgrounds'), { recursive: true });

  const imageBrowse = await browseFiles({
    projectRoot,
    dir: 'media',
    type: 'images'
  });

  assert.deepEqual(imageBrowse, {
    parent: '',
    dirs: ['media/backgrounds', 'media/scripts'],
    files: ['media/hero.png']
  });

  const defaultBrowse = await browseFiles({
    projectRoot,
    dir: 'media'
  });

  assert.deepEqual(defaultBrowse, {
    parent: '',
    dirs: ['media/backgrounds', 'media/scripts'],
    files: ['media/hero.png', 'media/readme.txt']
  });

  const scriptBrowse = await browseFiles({
    projectRoot,
    dir: 'media/scripts',
    type: 'scripts'
  });

  assert.deepEqual(scriptBrowse, {
    parent: 'media',
    dirs: [],
    files: ['media/scripts/player.js', 'media/scripts/player.json']
  });
});

test('globFiles expands multiple patterns relative to the project root', async (t) => {
  const projectRoot = await makeTempProjectRoot();
  t.after(() => fs.rm(projectRoot, { recursive: true, force: true }));

  await writeProjectFile(projectRoot, 'lib/game/entities/player.js');
  await writeProjectFile(projectRoot, 'lib/game/entities/enemy.js');
  await writeProjectFile(projectRoot, 'lib/game/powerups/shield.js');

  const files = await globFiles({
    projectRoot,
    patterns: ['lib/game/entities/*.js', '../lib/game/powerups/*.js']
  });

  assert.deepEqual(files, [
    'lib/game/entities/enemy.js',
    'lib/game/entities/player.js',
    'lib/game/powerups/shield.js'
  ]);
});

test('getGlobPatterns accepts the legacy glob[] query shape', () => {
  assert.deepEqual(
    getGlobPatterns({
      'glob[]': ['lib/game/entities/*.js', 'lib/game/powerups/*.js']
    }),
    ['lib/game/entities/*.js', 'lib/game/powerups/*.js']
  );
});

test('save route uses a larger urlencoded parser limit for Weltmeister level payloads', () => {
  assert.deepEqual(getWeltmeisterUrlencodedOptions(), {
    extended: false,
    limit: WELTMEISTER_URLENCODED_LIMIT
  });
  assert.equal(WELTMEISTER_URLENCODED_LIMIT, '10mb');
});
