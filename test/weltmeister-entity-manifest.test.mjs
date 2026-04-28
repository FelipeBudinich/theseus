import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import {
  buildEntityManifestArtifacts,
  checkEntityManifestArtifacts,
  writeEntityManifestArtifacts
} from '../tools/build-weltmeister-entity-manifest.mjs';

const ensureGlobal = (name, value) => {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value,
    writable: true
  });
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
  ensureGlobal('navigator', { maxTouchPoints: 0, userAgent: 'node' });
  ensureGlobal('screen', { availHeight: 0, availWidth: 0 });
  ensureGlobal('Image', class Image {});
  ensureGlobal('Audio', class Audio {
    canPlayType() {
      return '';
    }

    addEventListener() {}
    removeEventListener() {}
    load() {}
    pause() {}
  });
  ensureGlobal('XMLHttpRequest', class XMLHttpRequest {});
};

const makeTempProjectRoot = async () =>
  fs.mkdtemp(path.join(os.tmpdir(), 'theseus-weltmeister-entity-manifest-'));

const writeProjectFile = async (projectRoot, relativePath, contents = '') => {
  const targetPath = path.join(projectRoot, relativePath);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, contents, 'utf8');
  return targetPath;
};

test('buildEntityManifestArtifacts derives sorted entries and stable import metadata', async () => {
  const projectRoot = await makeTempProjectRoot();

  await writeProjectFile(projectRoot, 'lib/game/entities/zapper.js');
  await writeProjectFile(projectRoot, 'lib/game/entities/blob.js');
  await writeProjectFile(projectRoot, 'lib/game/entities/subdir/shield-wall.js');

  const artifacts = await buildEntityManifestArtifacts({
    projectRoot,
    sourceDirectories: ['lib/game/entities']
  });

  assert.deepEqual(
    artifacts.entries.map(({ key, moduleId, className, importPath }) => ({
      key,
      moduleId,
      className,
      importPath
    })),
    [
      {
        key: 'game/entities/blob',
        moduleId: 'game.entities.blob',
        className: 'EntityBlob',
        importPath: '../../lib/game/entities/blob.js'
      },
      {
        key: 'game/entities/subdir/shield-wall',
        moduleId: 'game.entities.subdir.shield-wall',
        className: 'EntityShieldWall',
        importPath: '../../lib/game/entities/subdir/shield-wall.js'
      },
      {
        key: 'game/entities/zapper',
        moduleId: 'game.entities.zapper',
        className: 'EntityZapper',
        importPath: '../../lib/game/entities/zapper.js'
      }
    ]
  );
});

test('writeEntityManifestArtifacts is reproducible and checkEntityManifestArtifacts detects drift', async () => {
  const projectRoot = await makeTempProjectRoot();

  await writeProjectFile(projectRoot, 'lib/game/entities/blob.js');
  await writeProjectFile(projectRoot, 'lib/game/entities/player.js');

  const firstWrite = await writeEntityManifestArtifacts({
    projectRoot,
    sourceDirectories: ['lib/game/entities']
  });
  const firstModuleSource = await fs.readFile(
    path.join(projectRoot, firstWrite.moduleOutputPath),
    'utf8'
  );

  await writeEntityManifestArtifacts({
    projectRoot,
    sourceDirectories: ['lib/game/entities']
  });
  const secondModuleSource = await fs.readFile(
    path.join(projectRoot, firstWrite.moduleOutputPath),
    'utf8'
  );

  assert.equal(firstModuleSource, secondModuleSource);

  const inSync = await checkEntityManifestArtifacts({
    projectRoot,
    sourceDirectories: ['lib/game/entities']
  });
  assert.equal(inSync.matches, true);

  await fs.writeFile(path.join(projectRoot, firstWrite.moduleOutputPath), '// stale\n', 'utf8');
  const stale = await checkEntityManifestArtifacts({
    projectRoot,
    sourceDirectories: ['lib/game/entities']
  });
  assert.equal(stale.matches, false);
});

test('ESM Weltmeister entity loader consumes the manifest and registers entity classes without AJAX discovery', async () => {
  installBrowserLikeGlobals();
  delete globalThis.$;
  delete globalThis.wm;

  const moduleUrl = `${pathToFileURL(path.resolve('tools/weltmeister/entities.js')).href}?test=${Date.now()}`;
  const {
    entityManifest,
    getLegacyEntityModuleMap,
    prepareWeltmeisterEntityState
  } = await import(moduleUrl);

  assert.equal(entityManifest.length > 0, true);
  assert.equal(entityManifest.some((entry) => entry.filePath === 'lib/game/entities/blob.js'), true);

  const prepared = await prepareWeltmeisterEntityState();
  assert.equal(prepared.entityModules['game.entities.blob'], 'lib/game/entities/blob.js');
  assert.equal(globalThis.wm.entityModules['game.entities.player'], 'lib/game/entities/player.js');
  assert.equal(getLegacyEntityModuleMap()['game.entities.levelchange'], 'lib/game/entities/levelchange.js');

  const blobEntry = prepared.loadedEntries.find((entry) => entry.className === 'EntityBlob');
  assert.equal(typeof blobEntry?.entityClass, 'function');
  assert.equal(blobEntry?.entityClass, globalThis.ig.getClass('EntityBlob'));
});
