import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const textExtensions = new Set(['.css', '.html', '.js', '.json', '.mjs']);
const retiredPathPrefixes = [`lib${'-esm/'}`, 'lib/weltmeister/'];

const listFiles = async (directory) => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)));
      continue;
    }

    if (textExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
};

test('live app and editor files no longer reference retired pre-rename paths', async () => {
  const files = [
    'test/esm-engine-smoke.html',
    'test/esm-smoke.html',
    'index.html',
    'server.mjs',
    'weltmeister.html',
    ...(await listFiles('lib')),
    ...(await listFiles('tools/weltmeister'))
  ];

  for (const filePath of files) {
    const source = await fs.readFile(filePath, 'utf8');
    for (const retiredPathPrefix of retiredPathPrefixes) {
      assert.equal(
        source.includes(retiredPathPrefix),
        false,
        `${filePath} still references retired pre-rename path: ${retiredPathPrefix}`
      );
    }
  }
});
