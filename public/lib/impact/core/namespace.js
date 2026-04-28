const createNamespace = (target, namespacePath) => {
  if (!namespacePath) {
    return target;
  }

  return namespacePath.split('.').reduce((current, segment) => {
    if (!segment) {
      return current;
    }

    if (typeof current[segment] !== 'object' || current[segment] === null) {
      current[segment] = {};
    }

    return current[segment];
  }, target);
};

const attachNamespaceHelpers = (ig) => {
  ig.namespace = (namespacePath, root = ig.global) => {
    if (!namespacePath) {
      return root;
    }

    if (namespacePath === 'ig') {
      return ig;
    }

    if (namespacePath.startsWith('ig.')) {
      return createNamespace(ig, namespacePath.slice(3));
    }

    return createNamespace(root, namespacePath);
  };

  return ig.namespace;
};

export { attachNamespaceHelpers, createNamespace };
