const isDomElement = (value) =>
  typeof HTMLElement !== 'undefined' && value instanceof HTMLElement;

const isImpactClassInstance = (ig, value) =>
  Boolean(ig.Class) && value instanceof ig.Class;

const copy = (ig, object) => {
  if (
    !object ||
    typeof object !== 'object' ||
    isDomElement(object) ||
    isImpactClassInstance(ig, object)
  ) {
    return object;
  }

  if (Array.isArray(object)) {
    return object.map((value) => copy(ig, value));
  }

  const clone = {};

  for (const key in object) {
    clone[key] = copy(ig, object[key]);
  }

  return clone;
};

const merge = (ig, original, extended) => {
  for (const key in extended) {
    const value = extended[key];

    if (
      typeof value !== 'object' ||
      value === null ||
      isDomElement(value) ||
      isImpactClassInstance(ig, value)
    ) {
      original[key] = value;
      continue;
    }

    if (!original[key] || typeof original[key] !== 'object') {
      original[key] = Array.isArray(value) ? [] : {};
    }

    merge(ig, original[key], value);
  }

  return original;
};

const ksort = (object) => {
  if (!object || typeof object !== 'object') {
    return [];
  }

  const keys = Object.keys(object).sort();
  return keys.map((key) => object[key]);
};

const attachObjectHelpers = (ig) => {
  ig.copy = (object) => copy(ig, object);
  ig.merge = (original, extended) => merge(ig, original, extended);
  ig.ksort = ksort;

  return ig;
};

export { attachObjectHelpers, copy, ksort, merge };
