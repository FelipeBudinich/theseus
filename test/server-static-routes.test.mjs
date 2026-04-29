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

const makeDocsStaticRoot = async (t) => {
  const staticRoot = await makeTempDirectory('theseus-docs-static-');
  t.after(() => fs.rm(staticRoot, { recursive: true, force: true }));

  await writeFile(staticRoot, 'index.html', [
    '<!doctype html>',
    '<html>',
    '<body>',
    '  <script type="module" src="lib/game/main.js"></script>',
    '</body>',
    '</html>'
  ].join('\n'));
  await writeFile(staticRoot, 'docs/status.md', [
    '# Status',
    '',
    'Plain docs body.',
    '',
    '```js',
    'const answer = 42;',
    '```'
  ].join('\n'));
  await writeFile(staticRoot, 'docs/api-guide.md', [
    'title: API Guide',
    'date: 2026.04.27 12:00',
    'tags: guide, reference',
    '',
    '---',
    '',
    '## Guide Body',
    '',
    'Tagged content.'
  ].join('\n'));
  await writeFile(staticRoot, 'docs/hidden.md', [
    'title: Hidden',
    'active: false',
    '',
    '---',
    '',
    'This doc should not be listed.'
  ].join('\n'));

  return staticRoot;
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

test('/docs.html lists markdown docs and /docs redirects to it', async (t) => {
  const staticRoot = await makeDocsStaticRoot(t);
  const { port } = await startTestServer({ staticRoot }, t);
  const redirectResponse = await requestServer({ port, path: '/docs' });
  const listResponse = await requestServer({ port, path: '/docs.html' });

  assert.equal(redirectResponse.statusCode, 301);
  assert.equal(redirectResponse.headers.location, '/docs.html');
  assert.equal(listResponse.statusCode, 200);
  assert.match(listResponse.text, /<h1>Docs<\/h1>/);
  assert.match(listResponse.text, /2 matching docs\./);
  assert.match(listResponse.text, /href="\/docs\/api-guide">API Guide<\/a>/);
  assert.match(listResponse.text, /href="\/docs\/status">Status<\/a>/);
  assert.doesNotMatch(listResponse.text, /Hidden/);
});

test('/docs/:keyword renders markdown docs and derives titles from h1 headings', async (t) => {
  const staticRoot = await makeDocsStaticRoot(t);
  const { port } = await startTestServer({ staticRoot }, t);
  const response = await requestServer({ port, path: '/docs/status' });
  const renderedTitleCount = response.text.match(/<h1>Status<\/h1>/g)?.length ?? 0;

  assert.equal(response.statusCode, 200);
  assert.equal(renderedTitleCount, 1);
  assert.match(response.text, /<title>Status<\/title>/);
  assert.match(response.text, /<p>Plain docs body\.<\/p>/);
  assert.match(response.text, /<code class="hljs language-js">/);
});

test('/docs/tag/:tag lists tagged docs only', async (t) => {
  const staticRoot = await makeDocsStaticRoot(t);
  const { port } = await startTestServer({ staticRoot }, t);
  const response = await requestServer({ port, path: '/docs/tag/guide' });

  assert.equal(response.statusCode, 200);
  assert.match(response.text, /Docs tagged &quot;guide&quot;/);
  assert.match(response.text, /1 matching doc\./);
  assert.match(response.text, /href="\/docs\/api-guide">API Guide<\/a>/);
  assert.doesNotMatch(response.text, /Status/);
});

test('/docs.json and /json expose docs-scoped metadata', async (t) => {
  const staticRoot = await makeDocsStaticRoot(t);
  const { port } = await startTestServer({ staticRoot }, t);
  const docsJsonResponse = await requestServer({
    port,
    path: '/docs.json?fields=keyword,title,tags&sort=keyword&order=asc'
  });
  const jsonAliasResponse = await requestServer({
    port,
    path: '/json?path=public/docs&fields=keyword,title,tags&tags=guide'
  });
  const badDocsJsonResponse = await requestServer({ port, path: '/docs.json?path=vault' });
  const badJsonAliasResponse = await requestServer({ port, path: '/json?path=vault' });

  assert.equal(docsJsonResponse.statusCode, 200);
  assert.deepEqual(
    JSON.parse(docsJsonResponse.text).notes,
    [
      { keyword: 'api-guide', title: 'API Guide', tags: ['guide', 'reference'] },
      { keyword: 'status', title: 'Status', tags: [] }
    ]
  );

  assert.equal(jsonAliasResponse.statusCode, 200);
  assert.deepEqual(
    JSON.parse(jsonAliasResponse.text).notes,
    [{ keyword: 'api-guide', title: 'API Guide', tags: ['guide', 'reference'] }]
  );

  assert.equal(badDocsJsonResponse.statusCode, 400);
  assert.equal(badJsonAliasResponse.statusCode, 400);
});

test('/docs/*.md still resolves as raw static markdown', async (t) => {
  const staticRoot = await makeDocsStaticRoot(t);
  const { port } = await startTestServer({ staticRoot }, t);
  const response = await requestServer({ port, path: '/docs/status.md' });

  assert.equal(response.statusCode, 200);
  assert.match(response.text, /^# Status/);
});

test('/media assets still resolve from the source tree', async (t) => {
  const distRoot = await makeTempDirectory('theseus-source-media-');
  t.after(() => fs.rm(distRoot, { recursive: true, force: true }));

  const { port } = await startTestServer({ distRoot }, t);
  const response = await requestServer({ port, path: '/media/tiles-70.png' });

  assert.equal(response.statusCode, 200);
  assert.ok(response.body.length > 0, 'expected media asset response to include file contents');
});

test('/tools/weltmeister.html resolves from the source tree', async (t) => {
  const distRoot = await makeTempDirectory('theseus-source-weltmeister-');
  t.after(() => fs.rm(distRoot, { recursive: true, force: true }));

  const { port } = await startTestServer({ distRoot }, t);
  const response = await requestServer({ port, path: '/tools/weltmeister.html' });

  assert.equal(response.statusCode, 200);
  assert.match(response.text, /<script type="module" src="\/tools\/weltmeister\/main\.js"><\/script>/);
});

test('/weltmeister.html no longer resolves from the source tree', async (t) => {
  const distRoot = await makeTempDirectory('theseus-retired-root-weltmeister-');
  t.after(() => fs.rm(distRoot, { recursive: true, force: true }));

  const { port } = await startTestServer({ distRoot }, t);
  const response = await requestServer({ port, path: '/weltmeister.html' });

  assert.equal(response.statusCode, 404);
});

test('/tools/weltmeister assets resolve and former /lib/weltmeister assets do not', async (t) => {
  const distRoot = await makeTempDirectory('theseus-source-weltmeister-assets-');
  t.after(() => fs.rm(distRoot, { recursive: true, force: true }));

  const { port } = await startTestServer({ distRoot }, t);
  const toolAssetResponse = await requestServer({
    port,
    path: '/tools/weltmeister/main.js'
  });
  const formerLibAssetResponse = await requestServer({
    port,
    path: '/lib/weltmeister/main.js'
  });

  assert.equal(toolAssetResponse.statusCode, 200);
  assert.match(toolAssetResponse.text, /bootWeltmeister/);
  assert.equal(formerLibAssetResponse.statusCode, 404);
});

test('/tools/font-tool.html resolves from the source tree and references its static assets', async (t) => {
  const distRoot = await makeTempDirectory('theseus-source-font-tool-');
  t.after(() => fs.rm(distRoot, { recursive: true, force: true }));

  const { port } = await startTestServer({ distRoot }, t);
  const response = await requestServer({ port, path: '/tools/font-tool.html' });

  assert.equal(response.statusCode, 200);
  assert.match(response.text, /href="\/tools\/font-tool\/font-tool\.css"/);
  assert.match(response.text, /src="\/tools\/font-tool\/font-tool\.js"/);
});

test('/font-tool.html no longer resolves from the source tree', async (t) => {
  const distRoot = await makeTempDirectory('theseus-retired-font-tool-');
  t.after(() => fs.rm(distRoot, { recursive: true, force: true }));

  const { port } = await startTestServer({ distRoot }, t);
  const response = await requestServer({ port, path: '/font-tool.html' });

  assert.equal(response.statusCode, 404);
});

test('/test/esm-smoke.html is private', async (t) => {
  const distRoot = await makeTempDirectory('theseus-source-esm-smoke-');
  t.after(() => fs.rm(distRoot, { recursive: true, force: true }));

  const { port } = await startTestServer({ distRoot }, t);
  const response = await requestServer({ port, path: '/test/esm-smoke.html' });

  assert.equal(response.statusCode, 404);
});

test('/test/esm-engine-smoke.html is private', async (t) => {
  const distRoot = await makeTempDirectory('theseus-source-esm-engine-smoke-');
  t.after(() => fs.rm(distRoot, { recursive: true, force: true }));

  const { port } = await startTestServer({ distRoot }, t);
  const response = await requestServer({ port, path: '/test/esm-engine-smoke.html' });

  assert.equal(response.statusCode, 404);
});

test('/tools implementation files are private', async (t) => {
  const distRoot = await makeTempDirectory('theseus-private-tools-');
  t.after(() => fs.rm(distRoot, { recursive: true, force: true }));

  const { port } = await startTestServer({ distRoot }, t);
  const apiSource = await requestServer({
    port,
    path: '/tools/weltmeister/api/node-api.mjs'
  });
  const manifestBuilder = await requestServer({
    port,
    path: '/tools/weltmeister/build-weltmeister-entity-manifest.mjs'
  });

  assert.equal(apiSource.statusCode, 404);
  assert.equal(manifestBuilder.statusCode, 404);
});
