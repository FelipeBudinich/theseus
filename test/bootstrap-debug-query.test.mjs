import assert from 'node:assert/strict';
import test from 'node:test';

import { searchEnablesDebug } from '../lib/game/debug-query.js';

test('debug query enables the bootstrap debug import only for empty or true values', () => {
  assert.equal(searchEnablesDebug('?debug'), true);
  assert.equal(searchEnablesDebug('?debug='), true);
  assert.equal(searchEnablesDebug('?debug=true'), true);
  assert.equal(searchEnablesDebug('?debug&debug=true'), true);

  assert.equal(searchEnablesDebug(''), false);
  assert.equal(searchEnablesDebug('?debug=false'), false);
  assert.equal(searchEnablesDebug('?debug=0'), false);
  assert.equal(searchEnablesDebug('?debugger'), false);
  assert.equal(searchEnablesDebug('?debug=true&debug=false'), false);
});
