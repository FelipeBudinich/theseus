const qs = (selector, root = document) => root.querySelector(selector);

const qsa = (selector, root = document) =>
  Array.from(root.querySelectorAll(selector));

const resolveElement = (elementOrSelector, root = document) => {
  if (typeof elementOrSelector === 'string') {
    return qs(elementOrSelector, root);
  }

  return elementOrSelector || null;
};

const on = (target, type, listener, options) => {
  target.addEventListener(type, listener, options);
  return () => target.removeEventListener(type, listener, options);
};

const show = (element, display = 'block') => {
  element.style.display = display;
  element.style.opacity = '';
};

const hide = (element) => {
  element.style.display = 'none';
};

const isVisible = (element) => {
  if (!element || element.style.display === 'none' || element.hidden) {
    return false;
  }

  if (typeof getComputedStyle !== 'function') {
    return true;
  }

  return getComputedStyle(element).display !== 'none';
};

const toggle = (element, display = 'block') => {
  if (isVisible(element)) {
    hide(element);
    return false;
  }

  show(element, display);
  return true;
};

const animationTimers = new WeakMap();

const nextFrame = (callback) => {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(callback);
  } else {
    setTimeout(callback, 0);
  }
};

const clearAnimationTimer = (element) => {
  var timer = animationTimers.get(element);
  if (timer) {
    clearTimeout(timer);
    animationTimers.delete(element);
  }
};

const fadeIn = (element, duration = 100, display = 'block') => {
  clearAnimationTimer(element);
  element.style.transition = 'none';
  element.style.opacity = '0';
  element.style.display = display;

  nextFrame(() => {
    element.style.transition = 'opacity ' + duration + 'ms linear';
    element.style.opacity = '1';
  });
};

const fadeOut = (element, duration = 100, callback = null) => {
  clearAnimationTimer(element);

  if (!isVisible(element)) {
    if (callback) {
      callback();
    }
    return;
  }

  element.style.transition = 'opacity ' + duration + 'ms linear';
  element.style.opacity = '0';

  var timer = setTimeout(() => {
    hide(element);
    element.style.transition = '';
    element.style.opacity = '';
    animationTimers.delete(element);
    if (callback) {
      callback();
    }
  }, duration);
  animationTimers.set(element, timer);
};

const fadeSwap = (element, update, duration = 100, display = 'block') => {
  fadeOut(element, duration, () => {
    update();
    fadeIn(element, duration, display);
  });
};

const positionBelow = (input, floatingElement) => {
  var inputRect = input.getBoundingClientRect();
  var offsetParent = floatingElement.offsetParent || getPositionedAncestor(floatingElement);
  var marginTop = parseFloat(getComputedStyle(input).marginTop) || 0;
  var top = 0;
  var left = 0;

  if (offsetParent === document.body || offsetParent === document.documentElement) {
    top = inputRect.top + window.scrollY + input.offsetHeight + marginTop + 1;
    left = inputRect.left + window.scrollX;
  } else {
    var parentRect = offsetParent.getBoundingClientRect();
    top =
      inputRect.top -
      parentRect.top +
      offsetParent.scrollTop +
      input.offsetHeight +
      marginTop +
      1;
    left = inputRect.left - parentRect.left + offsetParent.scrollLeft;
  }

  floatingElement.style.top = top + 'px';
  floatingElement.style.left = left + 'px';
  floatingElement.style.width = inputRect.width + 'px';
};

const getPositionedAncestor = (element) => {
  var parent = element.parentElement;

  while (parent && parent !== document.body) {
    if (getComputedStyle(parent).position !== 'static') {
      return parent;
    }
    parent = parent.parentElement;
  }

  return document.body;
};

export {
  fadeIn,
  fadeOut,
  fadeSwap,
  hide,
  isVisible,
  on,
  positionBelow,
  qs,
  qsa,
  resolveElement,
  show,
  toggle
};
