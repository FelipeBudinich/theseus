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

test('npm run bake builds the game into dist with /dist asset URLs', async () => {
  await runBake();

  const distIndexPath = path.resolve('dist/index.html');
  const distAssetsPath = path.resolve('dist/assets');
  const builtHtml = await fs.readFile(distIndexPath, 'utf8');
  const assetEntries = await fs.readdir(distAssetsPath);

  assert.match(builtHtml, /\/dist\/assets\//);
  assert.doesNotMatch(builtHtml, /lib\/game\/main\.js/);
  assert.ok(
    assetEntries.some((fileName) => fileName.endsWith('.js')),
    'expected dist/assets to contain a built JavaScript bundle'
  );
});
