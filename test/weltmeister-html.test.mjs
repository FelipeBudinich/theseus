import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const retiredAssetPrefix = `lib${'-esm/'}`;

test('tools/weltmeister.html boots the editor entirely from tools assets', async () => {
  const html = await fs.readFile(path.resolve('tools/weltmeister.html'), 'utf8');

  assert.match(html, /<base href="\/"\/>/);
  assert.match(html, /href="\/tools\/weltmeister\/weltmeister\.css"/);
  assert.doesNotMatch(html, /src="lib\/weltmeister\/jquery-1\.7\.1\.min\.js"/);
  assert.doesNotMatch(html, /src="lib\/weltmeister\/jquery-ui-1\.8\.1\.custom\.min\.js"/);
  assert.match(html, /<script type="module" src="\/tools\/weltmeister\/main\.js"><\/script>/);
  assert.doesNotMatch(
    html,
    new RegExp(`href="${retiredAssetPrefix}weltmeister/weltmeister\\.css"`)
  );
  assert.doesNotMatch(
    html,
    new RegExp(`src="${retiredAssetPrefix}weltmeister/jquery-1\\.7\\.1\\.min\\.js"`)
  );
  assert.doesNotMatch(html, /src="lib\/impact\/impact\.js"/);
  assert.doesNotMatch(html, /src="lib\/weltmeister\/weltmeister\.js"/);
});
