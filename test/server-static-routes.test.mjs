import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createApp } from '../server.mjs';

const makeTempDirectory = async (prefix) =>
  fs.mkdtemp(path.join(os.tmpdir(), prefix));

const writeFile = async (rootPath, relativePath, contents) => {
  const targetPath = path.join(rootPath, relativePath);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, contents, 'utf8');
  return targetPath;
};

const startTestServer = async (options = {}, t) => {
  const app = createApp(options);
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

const requestServer = ({ method = 'GET', port, path: requestPath, headers = {}, body }) =>
  new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path: requestPath,
        headers
      },
      (response) => {
        const chunks = [];

        response.on('data', (chunk) => {
          chunks.push(chunk);
        });
        response.on('end', () => {
          const responseBody = Buffer.concat(chunks);
          resolve({
            statusCode: response.statusCode ?? 0,
            headers: response.headers,
            body: responseBody,
            text: responseBody.toString('utf8')
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

test('/ serves public/index.html', async (t) => {
  const { port } = await startTestServer({}, t);
  const response = await requestServer({ port, path: '/' });

  assert.equal(response.statusCode, 200);
  assert.equal(response.text, await fs.readFile(path.resolve('public/index.html'), 'utf8'));
});

test('/dist.html serves public/dist/index.html when a baked build exists', async (t) => {
  const distRoot = await makeTempDirectory('theseus-dist-route-');
  t.after(() => fs.rm(distRoot, { recursive: true, force: true }));

  await writeFile(
    distRoot,
    'index.html',
    [
      '<!doctype html>',
      '<html>',
      '<body>Baked build</body>',
      '</html>'
    ].join('\n')
  );

  const { port } = await startTestServer({ distRoot }, t);
  const response = await requestServer({ port, path: '/dist.html' });

  assert.equal(response.statusCode, 200);
  assert.equal(response.text, await fs.readFile(path.join(distRoot, 'index.html'), 'utf8'));
});

test('/dist.html returns 404 with a bake hint when no baked build exists', async (t) => {
  const distRoot = await makeTempDirectory('theseus-empty-dist-');
  t.after(() => fs.rm(distRoot, { recursive: true, force: true }));

  const { port } = await startTestServer({ distRoot }, t);
  const response = await requestServer({ port, path: '/dist.html' });

  assert.equal(response.statusCode, 404);
  assert.match(response.text, /npm run bake/);
});

test('/media/* serves files from public/media', async (t) => {
  const { port } = await startTestServer({}, t);
  const response = await requestServer({ port, path: '/media/tiles-70.png' });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, await fs.readFile(path.resolve('public/media/tiles-70.png')));
});

test('/tools/weltmeister.html serves tools/weltmeister.html', async (t) => {
  const { port } = await startTestServer({}, t);
  const response = await requestServer({ port, path: '/tools/weltmeister.html' });

  assert.equal(response.statusCode, 200);
  assert.equal(response.text, await fs.readFile(path.resolve('tools/weltmeister.html'), 'utf8'));
});

test('/tools/font-tool.html serves tools/font-tool.html', async (t) => {
  const { port } = await startTestServer({}, t);
  const response = await requestServer({ port, path: '/tools/font-tool.html' });

  assert.equal(response.statusCode, 200);
  assert.equal(response.text, await fs.readFile(path.resolve('tools/font-tool.html'), 'utf8'));
});

test('/tools/weltmeister/api/* is mounted', async (t) => {
  const staticRoot = await makeTempDirectory('theseus-weltmeister-api-route-');
  t.after(() => fs.rm(staticRoot, { recursive: true, force: true }));

  await writeFile(staticRoot, 'media/hero.png', '');
  await writeFile(staticRoot, 'media/readme.txt', '');

  const { port } = await startTestServer({ staticRoot }, t);
  const response = await requestServer({
    port,
    path: '/tools/weltmeister/api/browse?dir=media&type=images'
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.text), {
    parent: '',
    dirs: [],
    files: ['media/hero.png']
  });
});
