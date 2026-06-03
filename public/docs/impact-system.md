# System

Defined in Module `public/lib/impact/system.js`

`ig.System` owns the canvas, drawing context, logical dimensions, render scale,
game delegate, timer tick, and run loop.

## Synopsis

```js
ig.system = new ig.System('#canvas', 60, 320, 240, 2);
ig.system.setGame(MyGame);
```

## Constructor

`new ig.System(canvasId, fps, width, height, scale)`

Finds the canvas, sets dimensions, creates a 2D context, chooses the draw mode,
and applies scale mode. Scale values other than `1` automatically switch the
global scale mode to crisp pixel rendering.

## Properties

- `fps` - target frames per second.
- `width`, `height` - logical game size.
- `realWidth`, `realHeight` - canvas backing size after scale.
- `scale` - render scale.
- `tick` - seconds elapsed in the latest frame.
- `animationId` - id returned by `ig.setAnimation()`.
- `newGameClass` - pending game class switch.
- `running` - run loop state.
- `delegate` - object with a `run()` method, usually `ig.game`.
- `clock` - instance `ig.Timer`.
- `canvas` - canvas element.
- `context` - 2D canvas context.
- `getDrawPos` - active draw position transform.

## Methods

- `resize(width, height, scale)` - updates logical size, scale, backing size, and canvas dimensions.
- `setGame(gameClass)` - switches immediately when stopped or defers during the run loop.
- `setGameNow(gameClass)` - instantiates the game and sets it as delegate.
- `setDelegate(object)` - starts the run loop with an object that has `run()`.
- `stopRunLoop()` - cancels the animation loop.
- `startRunLoop()` - restarts the animation loop.
- `clear(color)` - fills the full real canvas.
- `run()` - steps global time, updates `tick`, runs the delegate, clears input presses, and applies deferred game switches.

## Constants

`ig.System.DRAW`:

- `AUTHENTIC` - round before scaling.
- `SMOOTH` - round after scaling.
- `SUBPIXEL` - preserve subpixel coordinates.

`ig.System.SCALE`:

- `CRISP` - disables image smoothing and sets `image-rendering: pixelated`.
- `SMOOTH` - enables smoothing and clears image rendering override.

## Static Settings

- `ig.System.drawMode` - default `ig.System.DRAW.SMOOTH`.
- `ig.System.scaleMode` - default `ig.System.SCALE.SMOOTH`, switched to crisp by the constructor when scale is not `1`.
