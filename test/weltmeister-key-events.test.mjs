import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

test('Weltmeister UI keyboard shortcuts avoid deprecated key fallbacks', async () => {
  for (const file of [
    'tools/weltmeister/edit-entities.js',
    'tools/weltmeister/weltmeister.js'
  ]) {
    const source = await fs.readFile(path.resolve(file), 'utf8');

    assert.doesNotMatch(source, /\bwhich\b/);
    assert.doesNotMatch(source, /\bkeyCode\b/);
    assert.doesNotMatch(source, /String\.fromCharCode/);
  }
});
