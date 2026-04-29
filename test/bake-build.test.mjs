import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

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

test('npm run bake builds the game into public/dist with /dist asset URLs', async () => {
  await runBake();

  const distIndexPath = path.resolve('public/dist/index.html');
  const distAssetsPath = path.resolve('public/dist/assets');
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
