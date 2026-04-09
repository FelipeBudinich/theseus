const globalScope = typeof window !== 'undefined' ? window : globalThis;

const wm =
  globalScope.wm && typeof globalScope.wm === 'object' ? globalScope.wm : {};

globalScope.wm = wm;

const getJQuery = () => {
  const jquery = globalScope.jQuery ?? globalScope.$ ?? null;

  if (!jquery) {
    throw new Error(
      'Weltmeister ESM requires jQuery to be loaded before lib/weltmeister/main.js'
    );
  }

  return jquery;
};

export { getJQuery, globalScope };
export default wm;
