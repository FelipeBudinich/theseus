const LAST_LEVEL_KEY = 'wmLastLevel';

const getStorage = (storage) => {
  if (storage) {
    return storage;
  }

  try {
    return globalThis.localStorage || null;
  } catch (_storageError) {
    return null;
  }
};

const getLastLevel = ({ storage } = {}) => {
  try {
    return getStorage(storage)?.getItem(LAST_LEVEL_KEY) || null;
  } catch (_storageError) {
    return null;
  }
};

const setLastLevel = (path, { storage } = {}) => {
  try {
    var targetStorage = getStorage(storage);
    if (targetStorage) {
      targetStorage.setItem(LAST_LEVEL_KEY, path);
    }
  } catch (_storageError) {
    // Best-effort preference storage should not interrupt editor actions.
  }
};

const clearLastLevel = ({ storage } = {}) => {
  try {
    var targetStorage = getStorage(storage);
    if (targetStorage) {
      targetStorage.removeItem(LAST_LEVEL_KEY);
    }
  } catch (_storageError) {
    // Clearing best-effort browser state should not interrupt editor actions.
  }
};

export {
  LAST_LEVEL_KEY,
  clearLastLevel,
  getLastLevel,
  setLastLevel
};
