import { attachClassSystem } from './core/class.js';
import { attachNamespaceHelpers } from './core/namespace.js';
import { attachObjectHelpers } from './core/object.js';
import { attachVendorAttributeHelpers } from './core/vendor-attributes.js';

const globalScope = typeof window !== 'undefined' ? window : globalThis;
const existingIg =
  globalScope.ig && typeof globalScope.ig === 'object' ? globalScope.ig : {};

const ig = existingIg;

ig.game ??= null;
ig.debug ??= null;
ig.version ??= '1.24';
ig.global = globalScope;
ig.modules ??= {};
ig.resources ??= [];
ig.ready ??= false;
ig.baked ??= false;
ig.nocache ??= '';
ig.ua ??= {};
ig.prefix ??= globalScope.ImpactPrefix || '';
ig.lib ??= 'lib/';
ig.esm = true;
ig.$ ??= (selector) => {
  const documentRef = globalScope.document;

  if (!documentRef) {
    return null;
  }

  return selector.charAt(0) === '#'
    ? documentRef.getElementById(selector.slice(1))
    : documentRef.getElementsByTagName(selector);
};
ig.$new ??= (name) => globalScope.document?.createElement(name) ?? null;
ig.log ??= () => {};
ig.assert ??= () => {};
ig.show ??= () => {};
ig.mark ??= () => {};

attachNamespaceHelpers(ig);
attachObjectHelpers(ig);
attachVendorAttributeHelpers(ig);
attachClassSystem(ig);

globalScope.ig = ig;

export { ig };
export default ig;
