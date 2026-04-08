import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

test('weltmeister.html boots the editor from the native ESM entrypoint', async () => {
  const html = await fs.readFile(path.resolve('weltmeister.html'), 'utf8');

  assert.match(html, /<script type="module" src="lib-esm\/weltmeister\/main\.js"><\/script>/);
  assert.doesNotMatch(html, /src="lib\/impact\/impact\.js"/);
  assert.doesNotMatch(html, /src="lib\/weltmeister\/weltmeister\.js"/);
});
