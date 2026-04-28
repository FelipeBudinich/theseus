import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

test('bootstrap owns debug query parsing and keeps the debug import before main', async () => {
  const bootstrapSource = await fs.readFile(
    new URL('../lib/game/bootstrap.js', import.meta.url),
    'utf8'
  );
  const deletedHelperSpecifier = `./${['debug', 'query'].join('-')}.js`;

  assert.equal(bootstrapSource.includes(deletedHelperSpecifier), false);
  assert.match(bootstrapSource, /new URLSearchParams\(window\.location\.search\)\.getAll\('debug'\)/);
  assert.match(bootstrapSource, /value === '' \|\| value === 'true'/);
  assert.match(bootstrapSource, /await import\('\.\.\/impact\/debug\/debug\.js'\)/);
  assert.match(bootstrapSource, /await import\('\.\/main\.js'\)/);
  assert.ok(
    bootstrapSource.indexOf("await import('../impact/debug/debug.js')") <
      bootstrapSource.indexOf("await import('./main.js')"),
    'expected debug import to appear before the main game import'
  );
});
