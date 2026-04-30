import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  __private__,
  packMusicAtlasForBuild,
} from '../tools/bake/music-atlas-plugin.mjs';

const {
  FFMPEG_MISSING_MESSAGE,
  buildMusicAtlasManifestAssignment,
  buildRuntimeManifest,
  createMusicAliasEntries,
  groupMusicSources,
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

test('music source grouping collapses extension variants into one logical track', () => {
  const groups = groupMusicSources([
    {
      absolutePath: '/tmp/public/media/music/foo.mp3',
      path: 'media/music/foo.mp3',
      extension: 'mp3',
      stem: 'media/music/foo',
    },
    {
      absolutePath: '/tmp/public/media/music/foo.ogg',
      path: 'media\\music\\foo.ogg',
      extension: 'ogg',
      stem: 'media\\music\\foo',
    },
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].stem, 'media/music/foo');
  assert.deepEqual(
    groups[0].variants.map((variant) => variant.path),
    ['media/music/foo.ogg', 'media/music/foo.mp3'],
  );
});

test('music source preference picks ogg before mp3 by default', () => {
  const groups = groupMusicSources([
    {
      absolutePath: '/tmp/public/media/music/foo.mp3',
      path: 'media/music/foo.mp3',
      extension: 'mp3',
      stem: 'media/music/foo',
    },
    {
      absolutePath: '/tmp/public/media/music/foo.ogg',
      path: 'media/music/foo.ogg',
      extension: 'ogg',
      stem: 'media/music/foo',
    },
  ]);

  assert.equal(groups[0].source.path, 'media/music/foo.ogg');
});

test('music manifest aliases include wildcard and every existing extension variant', () => {
  const [wildcardAlias, oggAlias, mp3Alias] = createMusicAliasEntries({
    group: {
      stem: 'media/music/foo',
      source: { path: 'media/music/foo.ogg' },
      variants: [
        { path: 'media/music/foo.ogg' },
        { path: 'media/music/foo.mp3' },
      ],
    },
    atlasIndex: 0,
    start: 1,
    duration: 122.3456784,
  });

  assert.equal(wildcardAlias[0], 'media/music/foo.*');
  assert.equal(oggAlias[0], 'media/music/foo.ogg');
  assert.equal(mp3Alias[0], 'media/music/foo.mp3');
  assert.deepEqual(wildcardAlias[1], {
    atlas: 0,
    start: 1,
    duration: 122.345678,
    source: 'media/music/foo.ogg',
  });
  assert.deepEqual(oggAlias[1], wildcardAlias[1]);
  assert.deepEqual(mp3Alias[1], wildcardAlias[1]);
});

test('music runtime manifest uses base URLs and generated track aliases', () => {
  const manifest = buildRuntimeManifest({
    publicBase: '/dist/',
    outputDir: 'assets',
    atlasName: 'music-atlas',
    formats: ['ogg', 'mp3'],
    sampleRate: 44100,
    channels: 2,
    paddingSeconds: 1,
    atlasDuration: 124.56789,
    trackPlacements: [
      {
        group: {
          stem: 'media/music/foo',
          source: { path: 'media/music/foo.ogg' },
          variants: [
            { path: 'media/music/foo.ogg' },
            { path: 'media/music/foo.mp3' },
          ],
        },
        start: 1,
        duration: 122.3456784,
      },
    ],
  });

  assert.deepEqual(manifest.atlases[0].formats, {
    ogg: '/dist/assets/music-atlas.ogg',
    mp3: '/dist/assets/music-atlas.mp3',
  });
  assert.equal(manifest.atlases[0].duration, 124.56789);
  assert.equal(manifest.tracks['media/music/foo.*'].source, 'media/music/foo.ogg');
  assert.equal(manifest.tracks['media/music/foo.ogg'].duration, 122.345678);
  assert.equal(manifest.tracks['media/music/foo.mp3'].start, 1);
});

test('music manifest assignment escapes inline script JSON', () => {
  const assignment = buildMusicAtlasManifestAssignment({
    tracks: {
      'media/music/less-than.ogg': {
        source: 'media/music/less<than.ogg',
      },
    },
  });

  assert.match(assignment, /^globalThis\.__THESEUS_MUSIC_ATLAS_MANIFEST__ = /);
  assert.doesNotMatch(assignment, /</);
  assert.match(assignment, /\\u003c/);
});

test('packMusicAtlasForBuild returns null for missing sourceDir without requiring ffmpeg', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'theseus-music-missing-source-'));
  const originalPath = process.env.PATH;

  try {
    process.env.PATH = '';
    const build = await packMusicAtlasForBuild({
      projectRoot: tempRoot,
      sourceDir: 'media/music',
    });

    assert.equal(build, null);
  }
  finally {
    process.env.PATH = originalPath;
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test('packMusicAtlasForBuild reports a clear error when music exists and ffmpeg is missing', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'theseus-music-missing-ffmpeg-'));
  const emptyBin = path.join(tempRoot, 'bin');
  const musicDir = path.join(tempRoot, 'media', 'music');
  const originalPath = process.env.PATH;

  try {
    await fs.mkdir(emptyBin);
    await fs.mkdir(musicDir, { recursive: true });
    await fs.writeFile(path.join(musicDir, 'foo.ogg'), 'not real audio');
    process.env.PATH = emptyBin;

    await assert.rejects(
      () => packMusicAtlasForBuild({
        projectRoot: tempRoot,
        sourceDir: 'media/music',
      }),
      {
        message: FFMPEG_MISSING_MESSAGE,
      },
    );
  }
  finally {
    process.env.PATH = originalPath;
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

const ffmpegPath = await commandExists('ffmpeg');

test(
  'packMusicAtlasForBuild emits encoded atlas assets when ffmpeg is available',
  { skip: ffmpegPath ? false : 'ffmpeg not found on PATH; skipping music atlas encode integration test' },
  async () => {
    const build = await packMusicAtlasForBuild({
      projectRoot: path.resolve('public'),
      publicBase: '/dist/',
      sourceDir: 'media/music',
      atlasName: 'music-atlas',
      outputDir: 'assets',
      formats: ['ogg', 'mp3'],
    });

    assert.ok(build);
    assert.deepEqual(
      build.atlasAssets.map((asset) => asset.fileName),
      ['assets/music-atlas.ogg', 'assets/music-atlas.mp3'],
    );
    assert.ok(build.atlasAssets.every((asset) => Buffer.isBuffer(asset.source) && asset.source.length > 0));
    assert.equal(
      build.manifest.tracks['media/music/energy-warrior.*'].source,
      'media/music/energy-warrior.ogg',
    );
    assert.equal(
      build.manifest.tracks['media/music/energy-warrior.mp3'].source,
      'media/music/energy-warrior.ogg',
    );
  },
);
