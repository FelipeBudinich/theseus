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

const getDocument = (doc) => doc || globalThis.document || null;

const readCookie = (name, doc = getDocument()) => {
  if (!doc || typeof doc.cookie !== 'string') {
    return null;
  }

  var encodedName = encodeURIComponent(name) + '=';
  var cookies = doc.cookie.split(';');

  for (var i = 0; i < cookies.length; i++) {
    var cookie = cookies[i].trim();
    if (cookie.indexOf(encodedName) === 0) {
      return decodeURIComponent(cookie.slice(encodedName.length));
    }
  }

  return null;
};

const writeCookie = (name, value, doc = getDocument()) => {
  if (!doc) {
    return;
  }

  doc.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value) + '; path=/';
};

const deleteCookie = (name, doc = getDocument()) => {
  if (!doc) {
    return;
  }

  doc.cookie =
    encodeURIComponent(name) + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
};

const getLastLevel = ({ storage, document: doc } = {}) => {
  var targetStorage = getStorage(storage);

  try {
    var stored = targetStorage ? targetStorage.getItem(LAST_LEVEL_KEY) : null;
    if (stored) {
      return stored;
    }
  } catch (_storageError) {
    targetStorage = null;
  }

  var cookieValue = readCookie(LAST_LEVEL_KEY, getDocument(doc));
  if (!cookieValue) {
    return null;
  }

  try {
    if (targetStorage) {
      targetStorage.setItem(LAST_LEVEL_KEY, cookieValue);
      deleteCookie(LAST_LEVEL_KEY, getDocument(doc));
    }
  } catch (_storageError) {
    writeCookie(LAST_LEVEL_KEY, cookieValue, getDocument(doc));
  }

  return cookieValue;
};

const setLastLevel = (path, { storage, document: doc } = {}) => {
  var targetStorage = getStorage(storage);

  try {
    if (targetStorage) {
      targetStorage.setItem(LAST_LEVEL_KEY, path);
      deleteCookie(LAST_LEVEL_KEY, getDocument(doc));
      return;
    }
  } catch (_storageError) {
    // Fall back to the legacy cookie path below.
  }

  writeCookie(LAST_LEVEL_KEY, path, getDocument(doc));
};

const clearLastLevel = ({ storage, document: doc } = {}) => {
  try {
    var targetStorage = getStorage(storage);
    if (targetStorage) {
      targetStorage.removeItem(LAST_LEVEL_KEY);
    }
  } catch (_storageError) {
    // Clearing best-effort browser state should not interrupt editor actions.
  }

  deleteCookie(LAST_LEVEL_KEY, getDocument(doc));
};

export {
  LAST_LEVEL_KEY,
  clearLastLevel,
  deleteCookie,
  getLastLevel,
  readCookie,
  setLastLevel,
  writeCookie
};
