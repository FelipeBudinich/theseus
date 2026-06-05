import ig from '../../lib/impact/impact.js';
import config from './config.js';
import { requestJson } from './request.js';

let entityManifest = [];
let entityImporters = Object.freeze({});
let entityModuleMap = Object.freeze({});

const normalizeEditorPath = (value = '') =>
  String(value ?? '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^public\//, '')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');

const getEntityDirectoryForLevelPath = (levelPath = '') => {
  const normalizedPath = normalizeEditorPath(levelPath);
  const match = normalizedPath.match(/^games\/([^/]+)(?:\/|$)/);
  return match ? `games/${match[1]}/entities` : '';
};

const buildEntityModuleMap = (entries) =>
  Object.freeze(Object.fromEntries(entries.map((entry) => [entry.moduleId, entry.filePath])));

const buildEntityImporters = (entries) =>
  Object.freeze(Object.fromEntries(entries.map((entry) => [entry.key, () => import(entry.importPath)])));

const hasOption = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const setEntityManifestEntries = (entries = []) => {
  entityManifest = entries.map((entry) => ({ ...entry }));
  entityModuleMap = buildEntityModuleMap(entityManifest);
  entityImporters = buildEntityImporters(entityManifest);

  return listEntityManifestEntries();
};

const getEntityManifestEntry = (entryOrKey) => {
  if (!entryOrKey) {
    return null;
  }

  if (typeof entryOrKey === 'object') {
    return entryOrKey;
  }

  return (
    entityManifest.find(
      (entry) =>
        entry.key === entryOrKey ||
        entry.moduleId === entryOrKey ||
        entry.className === entryOrKey ||
        entry.filePath === entryOrKey
    ) ?? null
  );
};

const getLegacyEntityModuleMap = () => ({ ...entityModuleMap });

const listEntityManifestEntries = () => entityManifest.map((entry) => ({ ...entry }));

const loadEntityManifestForDirectory = async (entityDirectory, { fetchImpl } = {}) => {
  if (!entityDirectory) {
    return setEntityManifestEntries([]);
  }

  const manifest = await requestJson(
    `${config.api.entities}?dir=${encodeURIComponent(entityDirectory)}`,
    { fetchImpl }
  );

  return setEntityManifestEntries(manifest?.entities ?? []);
};

const loadEntityManifestForLevel = async (levelPath, options = {}) =>
  loadEntityManifestForDirectory(getEntityDirectoryForLevelPath(levelPath), options);

const loadEntityModule = async (entryOrKey) => {
  const entry = getEntityManifestEntry(entryOrKey);

  if (!entry) {
    throw new Error(`Unknown Weltmeister entity manifest entry: ${String(entryOrKey)}`);
  }

  await entityImporters[entry.key]();

  return {
    ...entry,
    entityClass: ig.getClass(entry.className)
  };
};

const loadEntityManifestModules = async () =>
  Promise.all(entityManifest.map((entry) => entityImporters[entry.key]()));

const loadAllEntityModules = async () => {
  await loadEntityManifestModules();
  return entityManifest.map((entry) => ({
    ...entry,
    entityClass: ig.getClass(entry.className)
  }));
};

const resolvePrepareArguments = (wmOrOptions, maybeOptions) => {
  if (
    wmOrOptions &&
    typeof wmOrOptions === 'object' &&
    !maybeOptions &&
    (
      hasOption(wmOrOptions, 'entityDirectory') ||
      hasOption(wmOrOptions, 'levelPath') ||
      hasOption(wmOrOptions, 'fetchImpl')
    )
  ) {
    return {
      wm: globalThis.wm ??= {},
      options: wmOrOptions
    };
  }

  return {
    wm: wmOrOptions ?? (globalThis.wm ??= {}),
    options: maybeOptions ?? {}
  };
};

const prepareWeltmeisterEntityState = async (wmOrOptions, maybeOptions) => {
  const { wm, options } = resolvePrepareArguments(wmOrOptions, maybeOptions);
  const entityDirectory =
    options.entityDirectory ??
    getEntityDirectoryForLevelPath(options.levelPath ?? '');

  await loadEntityManifestForDirectory(entityDirectory, options);
  const loadedEntries = await loadAllEntityModules();

  wm.entityManifest = listEntityManifestEntries();
  wm.entityModules = getLegacyEntityModuleMap();

  return {
    entityDirectory,
    entityManifest: wm.entityManifest,
    entityModules: wm.entityModules,
    loadedEntries
  };
};

export {
  entityImporters,
  entityManifest,
  entityModuleMap,
  getEntityDirectoryForLevelPath,
  getLegacyEntityModuleMap,
  getEntityManifestEntry,
  listEntityManifestEntries,
  loadAllEntityModules,
  loadEntityManifestForDirectory,
  loadEntityManifestForLevel,
  loadEntityManifestModules,
  loadEntityModule,
  prepareWeltmeisterEntityState,
  setEntityManifestEntries
};

export default prepareWeltmeisterEntityState;
