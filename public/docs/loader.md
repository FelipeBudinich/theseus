# Loader

Defined in Module `public/lib/impact/loader.js`

`ig.Loader` preloads resources, draws a simple loading bar, and starts the game
class when every resource reports success.

## Synopsis

```js
ig.main('#canvas', MyGame, 60, 320, 240, 2, ig.Loader);
```

## Constructor

`new ig.Loader(gameClass, resources)`

Stores the game class and resource list. The loader tracks resources by their
`path` property and binds its internal load callback.

## Properties

- `resources` - loadable resources, usually `ig.resources`.
- `gameClass` - class passed to `ig.system.setGame()`.
- `status` - target loading progress from `0` to `1`.
- `done` - true after `end()` has run.
- `_unloaded` - paths still waiting for success.
- `_drawStatus` - smoothed loading progress used by the bar.
- `_intervalId` - draw interval id.
- `_loadCallbackBound` - bound callback passed to resources.

## Methods

- `load()` - clears the screen, starts resource loading, and starts the draw interval.
- `loadResource(resource)` - calls `resource.load()` with the loader callback.
- `end()` - stops drawing and asks the system to switch to the game class.
- `draw()` - renders the black and white progress bar.
- `_loadCallback(path, status)` - removes successful paths, throws on failure, and schedules `end()` when complete.

## Notes

Resources must expose `path` and `load(callback)`. Images, fonts, and sounds
all follow that contract. If there are no resources, the loader immediately
starts the game.
