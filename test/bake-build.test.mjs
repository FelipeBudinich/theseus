import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const findFfmpeg = async () =>
  new Promise((resolve) => {
    const child = spawn('sh', ['-lc', 'command -v ffmpeg'], {
      cwd: path.resolve('.'),
      stdio: ['ignore', 'pipe', 'ignore']
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

const runBake = async () =>
  new Promise((resolve, reject) => {
    const child = spawn(npmCommand, ['run', 'bake'], {
      cwd: path.resolve('.'),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(`npm run bake failed with code ${code}\n${stdout}\n${stderr}`)
      );
    });
  });

const ffmpegPath = await findFfmpeg();

test('npm run bake builds the game into public/dist with /dist asset URLs', {
  skip: ffmpegPath ? false : 'ffmpeg not found on PATH; skipping baked build test that packs audio atlases'
}, async () => {
  await runBake();

  const distIndexPath = path.resolve('public/dist/index.html');
  const distAssetsPath = path.resolve('public/dist/assets');
  const obsoleteAtlasDirs = [
    path.resolve('public/dist/packed-textures'),
    path.resolve('public/dist/sfx-atlas'),
    path.resolve('public/dist/music-atlas'),
  ];
  const builtHtml = await fs.readFile(distIndexPath, 'utf8');
  const assetEntries = await fs.readdir(distAssetsPath);
  const builtAssetSources = await Promise.all(
    assetEntries
      .filter((fileName) => fileName.endsWith('.js'))
      .map((fileName) =>
        fs.readFile(path.join(distAssetsPath, fileName), 'utf8')
      )
  );
  const builtJavaScript = builtAssetSources.join('\n');

  assert.match(builtHtml, /\/dist\/assets\//);
  assert.doesNotMatch(builtHtml, /lib\/game\/main\.js/);
  assert.ok(
    assetEntries.some((fileName) => fileName.endsWith('.js')),
    'expected public/dist/assets to contain a built JavaScript bundle'
  );
  assert.ok(
    assetEntries.includes('theseus-atlas.webp'),
    'expected public/dist/assets/theseus-atlas.webp to be emitted'
  );
  assert.ok(
    assetEntries.includes('sfx-atlas.ogg'),
    'expected public/dist/assets/sfx-atlas.ogg to be emitted'
  );
  assert.ok(
    assetEntries.includes('sfx-atlas.mp3'),
    'expected public/dist/assets/sfx-atlas.mp3 to be emitted'
  );
  assert.ok(
    assetEntries.includes('music-atlas.ogg'),
    'expected public/dist/assets/music-atlas.ogg to be emitted'
  );
  assert.ok(
    assetEntries.includes('music-atlas.mp3'),
    'expected public/dist/assets/music-atlas.mp3 to be emitted'
  );
  for (const obsoleteAtlasDir of obsoleteAtlasDirs) {
    await assert.rejects(
      () => fs.stat(obsoleteAtlasDir),
      { code: 'ENOENT' },
      `expected ${obsoleteAtlasDir} not to be emitted as a top-level atlas directory`,
    );
  }
  assert.match(
    builtJavaScript,
    /globalThis\.__THESEUS_TEXTURE_ATLAS_MANIFEST__/
  );
  assert.match(
    builtJavaScript,
    /globalThis\.__THESEUS_SFX_ATLAS_MANIFEST__/
  );
  assert.match(
    builtJavaScript,
    /globalThis\.__THESEUS_MUSIC_ATLAS_MANIFEST__/
  );
  assert.equal(
    assetEntries.some((fileName) => /debug/i.test(fileName)),
    false,
    'expected bake output to exclude debug chunks'
  );
  assert.doesNotMatch(
    builtJavaScript,
    /impact\/debug|debug\/debug|entities-panel|maps-panel|graph-panel|Theseus\.Debug|ig_debug/
  );
});
