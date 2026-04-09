# ESM Migration Note

The native ESM migration is now complete in the live repo layout: browser and
editor entrypoints load only from `lib/`, and the legacy `ig.module(...)`
runtime has been retired.

## Live Entrypoints

- `index.html` loads the sample game from `lib/game/main.js`.
- `dist.html` is a server route that serves the latest Vite production build from `dist/index.html`.
- `weltmeister.html` loads the editor from `lib/weltmeister/main.js`.
- `test/esm-smoke.html` imports `lib/impact/ig.js` directly.
- `test/esm-engine-smoke.html` imports `lib/impact/impact.js` directly.

## Conversion Rule For Future Modules

1. Import every dependency explicitly from `lib/`.
2. Assign the public API back onto `ig` or a namespace created with `ig.namespace(...)`.
3. Export the same symbol from the file so ESM callers and legacy-style global access stay aligned.

## Module Shape

```js
import ig from './ig.js';
import { SomeDependency } from './some-dependency.js';

const Something = ig.Something = SomeDependency.extend({
  // ...
});

export { Something };
export default Something;
```

All live engine, game, and editor files should stay native ESM from the start.

The current runtime shape keeps `ig` as the default export from the Impact
entry modules. Browser callers import the module directly, while legacy-style
global access still works through `window.ig`.

## Weltmeister Entity Manifest

The live Weltmeister loader path reads generated entity metadata from
`lib/weltmeister/entity-manifest.js`, then `prepareWeltmeisterEntityState()`
loads those modules before `bootWeltmeister()` runs.

When you add, remove, or rename an ESM entity module, regenerate the manifest
with:

```sh
npm run build:weltmeister-entity-manifest
```

This also refreshes `lib/weltmeister/entity-manifest.json`, which mirrors
the manifest contents in a debug-friendly format.

The generator scans `lib/game/entities/**/*.js` by default. The underlying CLI
also supports `--check` so CI or local scripts can detect drift without
rewriting files.

## Weltmeister Browser Cutover

`weltmeister.html` boots from `lib/weltmeister/main.js` and loads its CSS,
jQuery bundles, API endpoints, and editor assets from the same `lib/`
tree. The existing jQuery-driven UI is still in place; only the file layout and
runtime pathing changed.

Level format stays explicit through the target file path:

- saving to a `.js` path writes a native ESM level module
- saving to a `.json` path writes plain JSON
- new untitled levels default to `.js` because `lib/weltmeister/config.js`
  currently sets `project.outputFormat` to `esm`

Current ESM level modules embed the level JSON between `/*JSON[*/` markers,
register themselves through `ig.Game.registerLevel(...)`, and export the level
symbol plus its resource list. Legacy `ig.module(...)`-wrapped level files are
not considered live-compatible inputs anymore.

## Generated Project Docs

`npm run module-graph` scans the live `lib/` tree and regenerates
`docs/module-graph.json` plus `docs/module-graph.md`. Use it after adding,
removing, or moving modules if you want the generated graph docs to stay in
sync with the codebase.

## Production Bake

Run the sample-game production build with:

```sh
npm run bake
```

This writes the built game to `dist/`. The Node server keeps `/` pointed at the
source `index.html`, while `/dist.html` serves the latest baked `dist/index.html`.
Built JavaScript is served from `/dist/assets/...`, but runtime media and sound
paths still come from the source-hosted `/media/...` tree.

## Build Tooling

The active maintenance scripts in `tools/` are Node-based helpers for the live
ESM project. The old `ig.module(...)` bake utilities have been removed from the
repo; use `npm run bake` for the current game build instead.
