import { installNativeExtensions } from './core/native-extensions.js';
import { attachClassSystem } from './core/class.js';
import { attachNamespaceHelpers } from './core/namespace.js';
import { attachObjectHelpers } from './core/object.js';
import { attachVendorAttributeHelpers } from './core/vendor-attributes.js';

installNativeExtensions();

const globalScope = typeof window !== 'undefined' ? window : globalThis;

if (!globalScope.window) {
  globalScope.window = globalScope;
}

const existingIg =
  globalScope.ig && typeof globalScope.ig === 'object' ? globalScope.ig : {};

const ig = existingIg;

const configureAnimationHelpers = () => {
  if (ig._animationConfigured) {
    return;
  }

  ig.normalizeVendorAttribute(globalScope, 'requestAnimationFrame');

  if (typeof globalScope.requestAnimationFrame === 'function') {
    let nextAnimationId = 1;
    const animations = {};

    ig.setAnimation = (callback) => {
      const currentAnimationId = nextAnimationId++;
      animations[currentAnimationId] = true;

      const animate = () => {
        if (!animations[currentAnimationId]) {
          return;
        }

        globalScope.requestAnimationFrame(animate);
        callback();
      };

      globalScope.requestAnimationFrame(animate);
      return currentAnimationId;
    };

    ig.clearAnimation = (animationId) => {
      delete animations[animationId];
    };
  } else {
    ig.setAnimation = (callback) => globalScope.setInterval(callback, 1000 / 60);
    ig.clearAnimation = (animationId) => globalScope.clearInterval(animationId);
  }

  ig._animationConfigured = true;
};

const bootEnvironment = () => {
  if (ig._booted) {
    return ig;
  }

  const href = globalScope.document?.location?.href || '';

  if (href.match(/\?nocache/)) {
    ig.setNocache(true);
  }

  ig.ua.pixelRatio = globalScope.devicePixelRatio || 1;
  ig.ua.viewport = {
    width: globalScope.innerWidth || 0,
    height: globalScope.innerHeight || 0
  };
  ig.ua.screen = {
    width: (globalScope.screen?.availWidth || 0) * ig.ua.pixelRatio,
    height: (globalScope.screen?.availHeight || 0) * ig.ua.pixelRatio
  };

  const userAgent = globalScope.navigator?.userAgent || '';
  ig.ua.iPhone = /iPhone|iPod/i.test(userAgent);
  ig.ua.iPhone4 = ig.ua.iPhone && ig.ua.pixelRatio === 2;
  ig.ua.iPad = /iPad/i.test(userAgent);
  ig.ua.android = /android/i.test(userAgent);
  ig.ua.winPhone = /Windows Phone/i.test(userAgent);
  ig.ua.iOS = ig.ua.iPhone || ig.ua.iPad;
  ig.ua.mobile = ig.ua.iOS || ig.ua.android || ig.ua.winPhone || /mobile/i.test(userAgent);
  ig.ua.touchDevice = 'ontouchstart' in globalScope || Boolean(globalScope.navigator?.msMaxTouchPoints);

  configureAnimationHelpers();

  if (globalScope.ImpactMixin) {
    ig.merge(ig, globalScope.ImpactMixin);
  }

  ig._booted = true;
  return ig;
};

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
ig._booted ??= false;
ig._animationConfigured ??= false;
ig.prefix ??= globalScope.ImpactPrefix || '';
ig.lib ??= 'lib/';
ig.esm = true;
ig.$ ??= (selector) => {
  const documentRef = globalScope.document;

  if (!documentRef) {
    return null;
  }

  if (typeof selector !== 'string') {
    return selector;
  }

  return selector.charAt(0) === '#'
    ? documentRef.getElementById(selector.slice(1))
    : documentRef.getElementsByTagName(selector);
};
ig.$new ??= (name) => globalScope.document?.createElement(name) ?? null;
ig.addResource ??= (resource) => {
  ig.resources.push(resource);
};
ig.setNocache ??= (set) => {
  ig.nocache = set ? `?${Date.now()}` : '';
};
ig.log ??= () => {};
ig.assert ??= () => {};
ig.show ??= () => {};
ig.mark ??= () => {};
ig.getImagePixels ??= (image, x, y, width, height) => {
  const canvas = ig.$new('canvas');

  if (!canvas) {
    throw new Error('ig.getImagePixels requires a canvas-capable document');
  }

  canvas.width = image.width;
  canvas.height = image.height;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('ig.getImagePixels requires a 2D canvas context');
  }

  if (ig.System?.SCALE?.CRISP) {
    ig.System.SCALE.CRISP(canvas, context);
  }

  const ratio = ig.getVendorAttribute(context, 'backingStorePixelRatio') || 1;
  ig.normalizeVendorAttribute(context, 'getImageDataHD');

  const realWidth = image.width / ratio;
  const realHeight = image.height / ratio;

  canvas.width = Math.ceil(realWidth);
  canvas.height = Math.ceil(realHeight);

  context.drawImage(image, 0, 0, realWidth, realHeight);

  if (ratio !== 1 && typeof context.getImageDataHD === 'function') {
    return context.getImageDataHD(x, y, width, height);
  }

  return context.getImageData(x, y, width, height);
};
ig.boot = () => bootEnvironment();

attachNamespaceHelpers(ig);
attachObjectHelpers(ig);
attachVendorAttributeHelpers(ig);
attachClassSystem(ig);

globalScope.ig = ig;
bootEnvironment();

export { ig };
export default ig;
