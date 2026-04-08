import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ensureGlobal = (name, value) => {
  if (globalThis[name] === undefined) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      value,
      writable: true
    });
  }
};

const installBrowserLikeGlobals = () => {
  ensureGlobal('window', globalThis);
  ensureGlobal('document', {
    body: {},
    createElement: () => ({
      getContext: () => null,
      style: {}
    }),
    getElementById: () => null,
    getElementsByTagName: () => [],
    location: { href: 'http://localhost/' },
    readyState: 'complete'
  });
  ensureGlobal('navigator', { msMaxTouchPoints: 0, userAgent: 'node' });
  ensureGlobal('screen', { availHeight: 0, availWidth: 0 });
  ensureGlobal('Image', class Image {});
  ensureGlobal('Audio', class Audio {
    canPlayType() {
      return '';
    }
  });
  ensureGlobal('XMLHttpRequest', class XMLHttpRequest {});
};

test('ESM engine entry exposes window.ig and ig.main', async () => {
  installBrowserLikeGlobals();

  const moduleUrl =
    `${pathToFileURL(path.resolve('lib-esm/impact/impact.js')).href}?test=${Date.now()}`;
  const engineModule = await import(moduleUrl);

  assert.equal(engineModule.default, globalThis.window.ig);
  assert.equal(typeof engineModule.default.main, 'function');
  assert.equal(typeof engineModule.default.Game.extend, 'function');
  assert.equal('ig' in engineModule, false);
  assert.equal('main' in engineModule, false);
});
