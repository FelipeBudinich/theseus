import ig from '../impact/impact.js';
import entityManifest, {
  entityImporters,
  entityModuleMap,
  loadEntityManifestModules
} from './entity-manifest.js';

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

const loadAllEntityModules = async () => {
  await loadEntityManifestModules();
  return entityManifest.map((entry) => ({
    ...entry,
    entityClass: ig.getClass(entry.className)
  }));
};

const prepareWeltmeisterEntityState = async (wm = globalThis.wm ??= {}) => {
  const loadedEntries = await loadAllEntityModules();

  wm.entityManifest = listEntityManifestEntries();
  wm.entityModules = getLegacyEntityModuleMap();

  return {
    entityManifest: wm.entityManifest,
    entityModules: wm.entityModules,
    loadedEntries
  };
};

export {
  entityManifest,
  entityModuleMap,
  getLegacyEntityModuleMap,
  getEntityManifestEntry,
  listEntityManifestEntries,
  loadAllEntityModules,
  loadEntityModule,
  prepareWeltmeisterEntityState
};

export default prepareWeltmeisterEntityState;
