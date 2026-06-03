# Impact Entry

Defined in Module `public/lib/impact/impact.js`

`impact.js` imports the full runtime, waits for optional debug loading, boots
the shared `ig` namespace, and defines `ig.main()`.

## Synopsis

```js
import ig from '/lib/impact/impact.js';

ig.main('#canvas', MyGame, 60, 640, 480, 1);
```

## Description

This is the normal browser entry point for games. It imports all core runtime
modules for their side effects, so classes such as `ig.Game`, `ig.Entity`,
`ig.Image`, `ig.Sound`, and `ig.System` are available on `ig`.

The module awaits `ig.debugReady` before continuing. This keeps URL-gated debug
loading deterministic: if the page requested `?debug`, debug injections are in
place before the game starts.

## Methods

### ig.main(canvasId, gameClass, fps, width, height, scale, loaderClass)

Creates the system services and starts loading game resources.

- `canvasId` - CSS id selector or canvas element accepted by `ig.$()`.
- `gameClass` - class to instantiate after loading.
- `fps` - target update rate.
- `width`, `height` - logical canvas size in game pixels.
- `scale` - render scale, default `1`.
- `loaderClass` - optional replacement for `ig.Loader`.

`ig.main()` creates `ig.system`, `ig.input`, `ig.soundManager`, and `ig.music`,
sets `ig.ready = true`, then creates a loader with `ig.resources`. The loader
eventually hands control to `ig.System.setGame()`.

## Imported Runtime Modules

`impact.js` imports animation, maps, collision, entities, entity pooling, font,
game, image, input, loader, sound, system, and timer modules. Import this file
when a game wants the complete runtime.
