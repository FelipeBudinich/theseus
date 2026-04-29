import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

test('ig owns debug query parsing and debug import', async () => {
  const igSource = await fs.readFile(
    new URL('../public/lib/impact/ig.js', import.meta.url),
    'utf8'
  );

  assert.match(
    igSource,
    /new URLSearchParams\(search\)\.getAll\('debug'\)/
  );

  assert.match(
    igSource,
    /value === '' \|\| value === 'true'/
  );

  assert.match(
    igSource,
    /import\('\.\/debug\/debug\.js'\)/
  );

  assert.match(
    igSource,
    /globalThis\.__THESEUS_INCLUDE_DEBUG__ !== false && hasDebugQuery\(\)/
  );

  assert.doesNotMatch(
    igSource,
    /import\(['"]\.\/main\.js['"]\)/
  );
});

test('impact waits for ig debug readiness before booting', async () => {
  const impactSource = await fs.readFile(
    new URL('../public/lib/impact/impact.js', import.meta.url),
    'utf8'
  );

  assert.match(impactSource, /await ig\.debugReady/);

  assert.ok(
    impactSource.indexOf('await ig.debugReady') <
      impactSource.indexOf('ig.boot()'),
    'expected debug readiness to be awaited before ig.boot()'
  );
});
