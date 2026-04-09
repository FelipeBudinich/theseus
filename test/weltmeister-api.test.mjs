import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  browseFiles,
  saveImageFile,
  saveFile
} from '../lib/weltmeister/api/node-api.mjs';
import { createApp } from '../server.mjs';

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

const startTestServer = async (projectRoot, t) => {
  const app = createApp({ projectRoot });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      })
  );

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  return { port };
};

const requestServer = ({ method = 'GET', port, path, headers = {}, body }) =>
  new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path,
        headers
      },
      (response) => {
        const chunks = [];

        response.on('data', (chunk) => {
          chunks.push(chunk);
        });
        response.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve({
            statusCode: response.statusCode ?? 0,
            body: text
          });
        });
      }
    );

    request.on('error', reject);

    if (body) {
      request.write(body);
    }

    request.end();
  });

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

test('saveImageFile writes .png files inside media relative to the configured project root', async (t) => {
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

test('saveImageFile strips traversal markers but keeps writes rooted inside media', async (t) => {
  const projectRoot = await makeTempProjectRoot();
  const sandboxRoot = path.dirname(projectRoot);
  t.after(() => fs.rm(projectRoot, { recursive: true, force: true }));

  const result = await saveImageFile({
    projectRoot,
    filePath: '../media/generated/safe.font.png',
    data: ONE_BY_ONE_PNG_DATA_URL
  });

  assert.deepEqual(result, {
    error: 0,
    path: 'media/generated/safe.font.png'
  });
  assert.deepEqual(
    await fs.readFile(path.join(projectRoot, 'media/generated/safe.font.png')),
    ONE_BY_ONE_PNG_BUFFER
  );
  await assert.rejects(fs.access(path.join(sandboxRoot, 'media/generated/safe.font.png')));
});

test('saveImageFile preserves the .png-only suffix constraint', async (t) => {
  const projectRoot = await makeTempProjectRoot();
  t.after(() => fs.rm(projectRoot, { recursive: true, force: true }));

  const result = await saveImageFile({
    projectRoot,
    filePath: 'media/generated/not-allowed.txt',
    data: ONE_BY_ONE_PNG_DATA_URL
  });

  assert.deepEqual(result, {
    error: '3',
    msg: 'File must have a .png suffix'
  });
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

test('saveImageFile rejects missing or invalid PNG data', async (t) => {
  const projectRoot = await makeTempProjectRoot();
  t.after(() => fs.rm(projectRoot, { recursive: true, force: true }));

  const missingDataResult = await saveImageFile({
    projectRoot,
    filePath: 'media/generated/missing.font.png',
    data: ''
  });

  assert.deepEqual(missingDataResult, {
    error: '1',
    msg: 'No Data or Path specified'
  });

  const invalidDataResult = await saveImageFile({
    projectRoot,
    filePath: 'media/generated/invalid.font.png',
    data: 'data:image/png;base64,not-a-real-png'
  });

  assert.deepEqual(invalidDataResult, {
    error: '5',
    msg: 'Image data must be base64-encoded PNG data'
  });
});

test('save route accepts JSON requests and returns ok on success', async (t) => {
  const projectRoot = await makeTempProjectRoot();
  t.after(() => fs.rm(projectRoot, { recursive: true, force: true }));

  await fs.mkdir(path.join(projectRoot, 'lib/game/levels'), { recursive: true });

  const { port } = await startTestServer(projectRoot, t);
  const requestBody = JSON.stringify({
    path: 'lib/game/levels/test-level.js',
    data: 'export default 1;\n'
  });

  const response = await requestServer({
    method: 'POST',
    port,
    path: '/lib/weltmeister/api/save',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestBody)
    },
    body: requestBody
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), { ok: true });
  assert.equal(
    await fs.readFile(path.join(projectRoot, 'lib/game/levels/test-level.js'), 'utf8'),
    'export default 1;\n'
  );
});

test('save route returns 400 with a JSON error for unsupported file suffixes', async (t) => {
  const projectRoot = await makeTempProjectRoot();
  t.after(() => fs.rm(projectRoot, { recursive: true, force: true }));

  const { port } = await startTestServer(projectRoot, t);
  const requestBody = JSON.stringify({
    path: 'lib/game/levels/not-allowed.txt',
    data: '{}'
  });

  const response = await requestServer({
    method: 'POST',
    port,
    path: '/lib/weltmeister/api/save',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestBody)
    },
    body: requestBody
  });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(JSON.parse(response.body), {
    error: 'File must have a .js or .json suffix'
  });
});

test('save-image route accepts JSON requests and returns ok with the written path', async (t) => {
  const projectRoot = await makeTempProjectRoot();
  t.after(() => fs.rm(projectRoot, { recursive: true, force: true }));

  const { port } = await startTestServer(projectRoot, t);
  const requestBody = JSON.stringify({
    path: 'media/generated/test.font.png',
    data: ONE_BY_ONE_PNG_DATA_URL
  });

  const response = await requestServer({
    method: 'POST',
    port,
    path: '/lib/weltmeister/api/save-image',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestBody)
    },
    body: requestBody
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), {
    ok: true,
    path: 'media/generated/test.font.png'
  });
  assert.deepEqual(
    await fs.readFile(path.join(projectRoot, 'media/generated/test.font.png')),
    ONE_BY_ONE_PNG_BUFFER
  );
});

test('save-image route returns 400 with a JSON error for invalid PNG payloads', async (t) => {
  const projectRoot = await makeTempProjectRoot();
  t.after(() => fs.rm(projectRoot, { recursive: true, force: true }));

  const { port } = await startTestServer(projectRoot, t);
  const requestBody = JSON.stringify({
    path: 'media/generated/invalid.font.png',
    data: 'data:image/png;base64,not-a-real-png'
  });

  const response = await requestServer({
    method: 'POST',
    port,
    path: '/lib/weltmeister/api/save-image',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestBody)
    },
    body: requestBody
  });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(JSON.parse(response.body), {
    error: 'Image data must be base64-encoded PNG data'
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

test('browse route returns image listings from the new browse endpoint', async (t) => {
  const projectRoot = await makeTempProjectRoot();
  t.after(() => fs.rm(projectRoot, { recursive: true, force: true }));

  await writeProjectFile(projectRoot, 'media/hero.png');
  await writeProjectFile(projectRoot, 'media/readme.txt');
  await writeProjectFile(projectRoot, 'media/.hidden.png');
  await writeProjectFile(projectRoot, 'media/scripts/player.js');
  await fs.mkdir(path.join(projectRoot, 'media/backgrounds'), { recursive: true });

  const { port } = await startTestServer(projectRoot, t);
  const response = await requestServer({
    port,
    path: '/lib/weltmeister/api/browse?dir=media&type=images'
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), {
    parent: '',
    dirs: ['media/backgrounds', 'media/scripts'],
    files: ['media/hero.png']
  });
});

test('browse route returns script listings from the new browse endpoint', async (t) => {
  const projectRoot = await makeTempProjectRoot();
  t.after(() => fs.rm(projectRoot, { recursive: true, force: true }));

  await writeProjectFile(projectRoot, 'media/scripts/player.js');
  await writeProjectFile(projectRoot, 'media/scripts/player.json');

  const { port } = await startTestServer(projectRoot, t);
  const response = await requestServer({
    port,
    path: '/lib/weltmeister/api/browse?dir=media/scripts&type=scripts'
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), {
    parent: 'media',
    dirs: [],
    files: ['media/scripts/player.js', 'media/scripts/player.json']
  });
});

test('createApp leaves glob.php unmatched so requests return 404', async (t) => {
  const projectRoot = await makeTempProjectRoot();
  t.after(() => fs.rm(projectRoot, { recursive: true, force: true }));

  const { port } = await startTestServer(projectRoot, t);

  const response = await requestServer({
    port,
    path: '/lib/weltmeister/api/glob.php'
  });

  assert.equal(response.statusCode, 404);
});

test('createApp leaves save.php unmatched so requests return 404', async (t) => {
  const projectRoot = await makeTempProjectRoot();
  t.after(() => fs.rm(projectRoot, { recursive: true, force: true }));

  const { port } = await startTestServer(projectRoot, t);
  const response = await requestServer({
    method: 'POST',
    port,
    path: '/lib/weltmeister/api/save.php'
  });

  assert.equal(response.statusCode, 404);
});

test('createApp leaves browse.php unmatched so requests return 404', async (t) => {
  const projectRoot = await makeTempProjectRoot();
  t.after(() => fs.rm(projectRoot, { recursive: true, force: true }));

  const { port } = await startTestServer(projectRoot, t);
  const response = await requestServer({
    port,
    path: '/lib/weltmeister/api/browse.php?dir=media&type=images'
  });

  assert.equal(response.statusCode, 404);
});
