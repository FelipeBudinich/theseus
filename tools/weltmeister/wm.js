const globalScope = typeof window !== 'undefined' ? window : globalThis;

const wm =
  globalScope.wm && typeof globalScope.wm === 'object' ? globalScope.wm : {};

globalScope.wm = wm;

export { globalScope };
export default wm;
