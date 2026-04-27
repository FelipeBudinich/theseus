import assert from 'node:assert/strict';
import test from 'node:test';

import { computeLayerOrder } from '../lib/weltmeister/layer-sorter.js';
import { requestJson } from '../lib/weltmeister/request.js';
import {
  LAST_LEVEL_KEY,
  clearLastLevel,
  getLastLevel,
  setLastLevel
} from '../lib/weltmeister/storage.js';

const createResponse = ({ ok, status = 200, statusText = 'OK', body = null }) => ({
  ok,
  status,
  statusText,
  json: async () => body,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body))
});

const createStorage = () => {
  const values = new Map();

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    }
  };
};

test('requestJson preserves Weltmeister save error response shape', async () => {
  await assert.rejects(
    requestJson('/save', {
      fetchImpl: async () =>
        createResponse({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          body: { error: 'Unsupported level path' }
        })
    }),
    (error) => {
      assert.equal(error.message, 'Unsupported level path');
      assert.equal(error.status, 400);
      assert.deepEqual(error.responseJSON, { error: 'Unsupported level path' });
      return true;
    }
  );
});

test('last-level storage reads, writes, and clears localStorage', () => {
  const storage = createStorage();

  assert.equal(getLastLevel({ storage }), null);

  setLastLevel('lib/game/levels/next.js', { storage });
  assert.equal(getLastLevel({ storage }), 'lib/game/levels/next.js');
  assert.equal(storage.getItem(LAST_LEVEL_KEY), 'lib/game/levels/next.js');

  clearLastLevel({ storage });
  assert.equal(storage.getItem(LAST_LEVEL_KEY), null);
});

test('last-level storage quietly ignores blocked localStorage', () => {
  const storage = {
    getItem() {
      throw new Error('storage blocked');
    },
    removeItem() {
      throw new Error('storage blocked');
    },
    setItem() {
      throw new Error('storage blocked');
    }
  };

  assert.equal(getLastLevel({ storage }), null);
  assert.doesNotThrow(() => setLastLevel('lib/game/levels/next.js', { storage }));
  assert.doesNotThrow(() => clearLastLevel({ storage }));
});

test('computeLayerOrder preserves DOM layer ordering semantics around entities', () => {
  const foreground = {
    name: 'foreground',
    setHotkey(value) {
      this.hotkey = value;
    }
  };
  const background = {
    name: 'background',
    setHotkey(value) {
      this.hotkey = value;
    }
  };
  const entities = {
    name: 'entities',
    setHotkey(value) {
      this.hotkey = value;
    }
  };
  const byName = new Map([
    [foreground.name, foreground],
    [background.name, background]
  ]);

  const layers = computeLayerOrder({
    names: ['foreground', 'entities', 'background'],
    entities,
    getLayerWithName: (name) => byName.get(name)
  });

  assert.deepEqual(layers.map((layer) => layer.name), ['background', 'foreground']);
  assert.equal(foreground.foreground, true);
  assert.equal(background.foreground, false);
  assert.equal(foreground.hotkey, 1);
  assert.equal(entities.hotkey, 2);
  assert.equal(background.hotkey, 3);
});
