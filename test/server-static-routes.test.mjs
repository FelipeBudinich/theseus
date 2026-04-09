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

const startTestServer = async ({ projectRoot, staticRoot, distRoot } = {}, t) => {
  const app = createApp({ projectRoot, staticRoot, distRoot });
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

test('/ serves the source game entry', async (t) => {
  const { port } = await startTestServer({}, t);
  const response = await requestServer({ port, path: '/' });

  assert.equal(response.statusCode, 200);
  assert.match(response.text, /<script type="module" src="lib\/game\/main\.js"><\/script>/);
});

test('/dist.html serves the baked build when dist/index.html exists', async (t) => {
  const distRoot = await makeTempDirectory('theseus-dist-route-');
  t.after(() => fs.rm(distRoot, { recursive: true, force: true }));

  await writeFile(
    distRoot,
    'index.html',
    [
      '<!DOCTYPE html>',
      '<html>',
      '<head>',
      '  <script type="module" src="/dist/assets/game.js"></script>',
      '</head>',
      '<body></body>',
      '</html>'
    ].join('\n')
  );
  await writeFile(distRoot, 'assets/game.js', 'window.__distLoaded = true;\n');

  const { port } = await startTestServer({ distRoot }, t);
  const htmlResponse = await requestServer({ port, path: '/dist.html' });
  const assetResponse = await requestServer({ port, path: '/dist/assets/game.js' });

  assert.equal(htmlResponse.statusCode, 200);
  assert.match(htmlResponse.text, /\/dist\/assets\/game\.js/);
  assert.equal(assetResponse.statusCode, 200);
  assert.match(assetResponse.text, /window\.__distLoaded = true/);
});

test('/dist.html returns 404 with a bake hint when no build exists', async (t) => {
  const distRoot = await makeTempDirectory('theseus-empty-dist-');
  t.after(() => fs.rm(distRoot, { recursive: true, force: true }));

  const { port } = await startTestServer({ distRoot }, t);
  const response = await requestServer({ port, path: '/dist.html' });

  assert.equal(response.statusCode, 404);
  assert.match(response.text, /npm run bake/);
});

test('/media assets still resolve from the source tree', async (t) => {
  const distRoot = await makeTempDirectory('theseus-source-media-');
  t.after(() => fs.rm(distRoot, { recursive: true, force: true }));

  const { port } = await startTestServer({ distRoot }, t);
  const response = await requestServer({ port, path: '/media/tiles-70.png' });

  assert.equal(response.statusCode, 200);
  assert.ok(response.body.length > 0, 'expected media asset response to include file contents');
});

test('/weltmeister.html still resolves from the source tree', async (t) => {
  const distRoot = await makeTempDirectory('theseus-source-weltmeister-');
  t.after(() => fs.rm(distRoot, { recursive: true, force: true }));

  const { port } = await startTestServer({ distRoot }, t);
  const response = await requestServer({ port, path: '/weltmeister.html' });

  assert.equal(response.statusCode, 200);
  assert.match(response.text, /<script type="module" src="lib\/weltmeister\/main\.js"><\/script>/);
});

test('/test/esm-smoke.html still resolves from the source tree', async (t) => {
  const distRoot = await makeTempDirectory('theseus-source-esm-smoke-');
  t.after(() => fs.rm(distRoot, { recursive: true, force: true }));

  const { port } = await startTestServer({ distRoot }, t);
  const response = await requestServer({ port, path: '/test/esm-smoke.html' });

  assert.equal(response.statusCode, 200);
  assert.match(response.text, /\.\.\/lib\/impact\/ig\.js/);
});

test('/test/esm-engine-smoke.html still resolves from the source tree', async (t) => {
  const distRoot = await makeTempDirectory('theseus-source-esm-engine-smoke-');
  t.after(() => fs.rm(distRoot, { recursive: true, force: true }));

  const { port } = await startTestServer({ distRoot }, t);
  const response = await requestServer({ port, path: '/test/esm-engine-smoke.html' });

  assert.equal(response.statusCode, 200);
  assert.match(response.text, /\.\.\/lib\/impact\/impact\.js/);
});
