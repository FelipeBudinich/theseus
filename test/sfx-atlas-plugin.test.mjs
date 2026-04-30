import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';

import {
  __private__,
  packSfxAtlasForBuild,
} from '../tools/bake/sfx-atlas-plugin.mjs';

const {
  buildRuntimeManifest,
  buildSfxAtlasManifestAssignment,
  createSfxAliasEntries,
  groupSfxSources,
  joinPublicBase,
  normalizePublicPath,
} = __private__;

const commandExists = (command) =>
  new Promise((resolve) => {
    const child = spawn('sh', ['-lc', `command -v ${command}`], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    let stdout = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.on('error', () => {
      resolve(null);
    });

    child.on('close', (code) => {
      resolve(code === 0 ? stdout.trim() : null);
    });
  });

test('SFX source grouping collapses extension variants into one logical sound', () => {
  const groups = groupSfxSources([
    {
      absolutePath: '/tmp/public/media/sounds/jump.mp3',
      path: 'media/sounds/jump.mp3',
      extension: 'mp3',
      stem: 'media/sounds/jump',
    },
    {
      absolutePath: '/tmp/public/media/sounds/jump.ogg',
      path: 'media\\sounds\\jump.ogg',
      extension: 'ogg',
      stem: 'media\\sounds\\jump',
    },
    {
      absolutePath: '/tmp/public/media/sounds/coin.ogg',
      path: 'media/sounds/coin.ogg',
      extension: 'ogg',
      stem: 'media/sounds/coin',
    },
  ]);

  assert.equal(groups.length, 2);
  assert.equal(groups[1].stem, 'media/sounds/jump');
  assert.equal(groups[1].source.path, 'media/sounds/jump.ogg');
  assert.deepEqual(
    groups[1].variants.map((variant) => variant.path),
    ['media/sounds/jump.ogg', 'media/sounds/jump.mp3'],
  );
});

test('SFX manifest aliases include wildcard and every existing extension variant', () => {
  const [wildcardAlias, oggAlias, mp3Alias] = createSfxAliasEntries({
    group: {
      stem: 'media/sounds/jump',
      source: { path: 'media/sounds/jump.ogg' },
      variants: [
        { path: 'media/sounds/jump.ogg' },
        { path: 'media/sounds/jump.mp3' },
      ],
    },
    atlasIndex: 0,
    start: 0.05,
    duration: 0.213333333,
  });

  assert.equal(wildcardAlias[0], 'media/sounds/jump.*');
  assert.equal(oggAlias[0], 'media/sounds/jump.ogg');
  assert.equal(mp3Alias[0], 'media/sounds/jump.mp3');
  assert.deepEqual(wildcardAlias[1], {
    atlas: 0,
    start: 0.05,
    duration: 0.213333,
    source: 'media/sounds/jump.ogg',
  });
  assert.deepEqual(oggAlias[1], wildcardAlias[1]);
  assert.deepEqual(mp3Alias[1], wildcardAlias[1]);
});

test('SFX atlas path helpers normalize to POSIX and preserve the Vite public base', () => {
  assert.equal(
    normalizePublicPath('.\\media\\sounds\\jump.ogg'),
    'media/sounds/jump.ogg',
  );
  assert.equal(
    joinPublicBase('/dist', 'sfx-atlas\\sfx-atlas.ogg'),
    '/dist/sfx-atlas/sfx-atlas.ogg',
  );
  assert.equal(
    joinPublicBase('/dist/', '/sfx-atlas/sfx-atlas.mp3'),
    '/dist/sfx-atlas/sfx-atlas.mp3',
  );
});

test('SFX runtime manifest uses base URLs and generated sound aliases', () => {
  const manifest = buildRuntimeManifest({
    publicBase: '/dist/',
    outputDir: 'sfx-atlas',
    atlasName: 'sfx-atlas',
    formats: ['ogg', 'mp3'],
    sampleRate: 44100,
    channels: 2,
    paddingSeconds: 0.05,
    atlasDuration: 1.23456789,
    clipPlacements: [
      {
        group: {
          stem: 'media/sounds/jump',
          source: { path: 'media/sounds/jump.ogg' },
          variants: [
            { path: 'media/sounds/jump.ogg' },
            { path: 'media/sounds/jump.mp3' },
          ],
        },
        start: 0.05,
        duration: 0.213333333,
      },
    ],
  });

  assert.deepEqual(manifest.atlases[0].formats, {
    ogg: '/dist/sfx-atlas/sfx-atlas.ogg',
    mp3: '/dist/sfx-atlas/sfx-atlas.mp3',
  });
  assert.equal(manifest.atlases[0].duration, 1.234568);
  assert.equal(manifest.sounds['media/sounds/jump.*'].source, 'media/sounds/jump.ogg');
  assert.equal(manifest.sounds['media/sounds/jump.ogg'].duration, 0.213333);
  assert.equal(manifest.sounds['media/sounds/jump.mp3'].start, 0.05);
});

test('SFX manifest assignment escapes inline script JSON', () => {
  const assignment = buildSfxAtlasManifestAssignment({
    sounds: {
      'media/sounds/less-than.ogg': {
        source: 'media/sounds/less<than.ogg',
      },
    },
  });

  assert.match(assignment, /^globalThis\.__THESEUS_SFX_ATLAS_MANIFEST__ = /);
  assert.doesNotMatch(assignment, /</);
  assert.match(assignment, /\\u003c/);
});

const ffmpegPath = await commandExists('ffmpeg');

test(
  'packSfxAtlasForBuild emits encoded atlas assets when ffmpeg is available',
  { skip: ffmpegPath ? false : 'ffmpeg not found on PATH; skipping SFX atlas encode integration test' },
  async () => {
    const build = await packSfxAtlasForBuild({
      projectRoot: path.resolve('public'),
      publicBase: '/dist/',
      sourceDir: 'media/sounds',
      atlasName: 'sfx-atlas',
      outputDir: 'sfx-atlas',
      formats: ['ogg', 'mp3'],
    });

    assert.ok(build);
    assert.deepEqual(
      build.atlasAssets.map((asset) => asset.fileName),
      ['sfx-atlas/sfx-atlas.ogg', 'sfx-atlas/sfx-atlas.mp3'],
    );
    assert.ok(build.atlasAssets.every((asset) => Buffer.isBuffer(asset.source) && asset.source.length > 0));
    assert.equal(build.manifest.sounds['media/sounds/jump.*'].source, 'media/sounds/jump.ogg');
    assert.equal(build.manifest.sounds['media/sounds/coin.mp3'].source, 'media/sounds/coin.ogg');
  },
);
