# Input

Defined in Module `public/lib/impact/input.js`

`ig.Input` maps browser input codes to named game actions. It tracks held
actions, one-frame presses, one-frame releases, mouse position, and
accelerometer data.

## Synopsis

```js
ig.input.bind('ArrowLeft', 'left');
ig.input.bind('KeyX', 'jump');
ig.input.bind('MousePrimary', 'shoot');

if (ig.input.pressed('jump')) {
  player.jump();
}
```

## Constructor

`new ig.Input()`

The class has no custom `init()` method. Event listeners are installed lazily
when bindings require keyboard, mouse, touch, accelerometer, or plugin-backed
gamepad input.

## Properties

- `bindings` - input code to action map.
- `actions` - action held state.
- `presses` - action pressed this frame.
- `locks` - prevents repeated `pressed()` while an input is held.
- `delayedKeyup` - release queue cleared after the system run.
- `isUsingMouse`, `isUsingKeyboard`, `isUsingAccelerometer` - listener flags.
- `mouse` - current mouse or touch position in game pixels.
- `accel` - device acceleration including gravity.

## Methods

- `initMouse()` - installs wheel, mouse, context-menu, and touch listeners on the canvas.
- `initKeyboard()` - installs window keydown and keyup listeners.
- `initAccelerometer()` - installs a device motion listener.
- `mouseInputCode(event)` - converts mouse and touch events to Theseus mouse codes.
- `isMouseInputCode(code)` - returns true for mouse and wheel codes.
- `mousewheel(event)` - maps wheel direction to `WheelUp` or `WheelDown`.
- `mousemove(event)` - updates mouse coordinates using canvas scale and bounds.
- `contextmenu(event)` - suppresses the menu when secondary mouse is bound.
- `keydown(event)` - sets action state and one-frame press.
- `keyup(event)` - queues one-frame release.
- `devicemotion(event)` - stores `accelerationIncludingGravity`.
- `bind(key, action)` - binds a string input code to an action.
- `bindTouch(selector, action)` - binds touch start/end on a DOM element.
- `unbind(key)` - removes a binding and queues release for its action.
- `unbindAll()` - clears all bindings and state.
- `state(action)` - returns whether an action is held.
- `pressed(action)` - returns whether an action was pressed this frame.
- `released(action)` - returns whether an action was released this frame.
- `clearPressed()` - clears one-frame presses and applies delayed releases.
- `touchStart(event, action)` - helper for element touch bindings.
- `touchEnd(event, action)` - helper for element touch bindings.

## Input Codes

Keyboard bindings use `KeyboardEvent.code`, such as `ArrowLeft`, `KeyX`, and
`Space`. Mouse and wheel bindings use Theseus strings: `MousePrimary`,
`MouseSecondary`, `MouseAuxiliary`, `MouseBack`, `MouseForward`, `WheelUp`, and
`WheelDown`.

## Theseus Notes

`bind()` requires string codes. Gamepad bindings must include a controller slot,
for example `Gamepad0Left`; generic names such as `GamepadLeft` throw an error.
The actual gamepad listener comes from the gamepad plugin through
`initGamepad()`.
