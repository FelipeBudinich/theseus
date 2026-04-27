import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

let gamepads = [];
const windowListeners = [];

const installBrowserLikeGlobals = () => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: globalThis,
    writable: true
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      body: {},
      createElement: () => ({
        getContext: () => null,
        style: {}
      }),
      getElementById: () => null,
      getElementsByTagName: () => [],
      location: { href: 'http://localhost/' },
      readyState: 'complete'
    },
    writable: true
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      getGamepads: () => gamepads,
      maxTouchPoints: 0,
      userAgent: 'node'
    },
    writable: true
  });
  Object.defineProperty(globalThis, 'screen', {
    configurable: true,
    value: { availHeight: 0, availWidth: 0 },
    writable: true
  });
  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: class Image {},
    writable: true
  });
  Object.defineProperty(globalThis, 'Audio', {
    configurable: true,
    value: class Audio {
      canPlayType() {
        return '';
      }
    },
    writable: true
  });
  Object.defineProperty(globalThis, 'XMLHttpRequest', {
    configurable: true,
    value: class XMLHttpRequest {},
    writable: true
  });

  globalThis.addEventListener = (type, listener, useCapture) => {
    windowListeners.push({ type, listener, useCapture });
  };
};

installBrowserLikeGlobals();

const impactUrl = pathToFileURL(path.resolve('lib/impact/impact.js')).href;
const gamepadUrl =
  `${pathToFileURL(path.resolve('lib/plugins/gamepad.js')).href}?gamepad-test=${Date.now()}`;

const ig = (await import(impactUrl)).default;
await import(gamepadUrl);

const createButton = ({ pressed = false, value = pressed ? 1 : 0 } = {}) => ({
  pressed,
  value
});

const createGamepad = ({
  axes = [],
  buttons = {},
  connected = true,
  index = 0,
  mapping = 'standard'
} = {}) => {
  const gamepadButtons = Array.from({ length: 17 }, (_, buttonIndex) =>
    buttons[buttonIndex] || createButton()
  );
  const gamepadAxes = [0, 0, 0, 0];

  for (var i = 0; i < axes.length; i++) {
    gamepadAxes[i] = axes[i];
  }

  return {
    axes: gamepadAxes,
    buttons: gamepadButtons,
    connected,
    index,
    mapping
  };
};

const createInput = () => {
  const input = new ig.Input();
  windowListeners.length = 0;
  return input;
};

test('gamepad plugin removes legacy public numeric constants', () => {
  const legacyGamepadName = 'GAME' + 'PAD';
  const legacyOffsetName = legacyGamepadName + '_BUTTON_OFFSET';

  assert.equal(ig[legacyGamepadName], undefined);
  assert.equal(ig[legacyOffsetName], undefined);
});

test('standard button 0 fires raw and semantic face-bottom codes', () => {
  gamepads = [createGamepad({ buttons: { 0: createButton({ pressed: true }) } })];
  const input = createInput();

  input.bind('GamepadButton0', 'rawJump');
  input.bind('GamepadFaceBottom', 'jump');
  input.pollGamepad();

  assert.equal(input.presses.rawJump, true);
  assert.equal(input.presses.jump, true);
  assert.equal(input.actions.rawJump, true);
  assert.equal(input.actions.jump, true);
});

test('standard d-pad left button fires GamepadLeft alias', () => {
  gamepads = [createGamepad({ buttons: { 14: createButton({ pressed: true }) } })];
  const input = createInput();

  input.bind('GamepadLeft', 'left');
  input.pollGamepad();

  assert.equal(input.presses.left, true);
  assert.equal(input.actions.left, true);
});

test('standard left stick axis fires GamepadLeft alias', () => {
  gamepads = [createGamepad({ axes: [-0.75, 0, 0, 0] })];
  const input = createInput();

  input.bind('GamepadLeft', 'left');
  input.pollGamepad();

  assert.equal(input.presses.left, true);
  assert.equal(input.actions.left, true);
});

test('non-standard axes fire raw fallback codes only', () => {
  gamepads = [createGamepad({ axes: [-0.75, 0.75], mapping: '' })];
  const input = createInput();

  input.bind('GamepadAxis0Negative', 'leftAxis');
  input.bind('GamepadAxis1Positive', 'downAxis');
  input.bind('GamepadLeft', 'left');
  input.pollGamepad();

  assert.equal(input.presses.leftAxis, true);
  assert.equal(input.presses.downAxis, true);
  assert.equal(input.presses.left, undefined);
});

test('released gamepad codes populate delayedKeyup', () => {
  const gamepad = createGamepad({ buttons: { 0: createButton({ pressed: true }) } });
  gamepads = [gamepad];
  const input = createInput();

  input.bind('GamepadFaceBottom', 'jump');
  input.pollGamepad();
  input.clearPressed();

  gamepad.buttons[0] = createButton();
  input.pollGamepad();

  assert.equal(input.delayedKeyup.jump, true);
});
