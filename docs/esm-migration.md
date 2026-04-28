# ESM Migration Note

The native ESM migration is complete in the live repo layout: the game runtime
loads from `lib/`, and the browser-side editor tooling loads from
`tools/weltmeister/`.

## Live Entrypoints

- `index.html` loads the sample game from `lib/game/main.js`.
- `dist.html` is a server route that serves the latest Vite production build from `dist/index.html`.
- `weltmeister.html` loads the editor from `tools/weltmeister/main.js`.
- `test/esm-smoke.html` imports `lib/impact/ig.js` directly.
- `test/esm-engine-smoke.html` imports `lib/impact/impact.js` directly.

## Conversion Rule For Future Modules

1. Import every dependency explicitly from `lib/`.
2. Assign the public API back onto `ig` or a namespace created with `ig.namespace(...)`.
3. Export the same symbol from the file so ESM callers and global access stay aligned.

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
entry modules. Browser callers import the module directly, and global access
still works through `window.ig`.

## Weltmeister Entity Manifest

The live Weltmeister loader path reads generated entity metadata from
`tools/weltmeister/entity-manifest.js`, then `prepareWeltmeisterEntityState()`
loads those modules before `bootWeltmeister()` runs.

When you add, remove, or rename an ESM entity module, regenerate the manifest
with:

```sh
npm run build:weltmeister-entity-manifest
```

This also refreshes `tools/weltmeister/entity-manifest.json`, which mirrors
the manifest contents in a debug-friendly format.

The generator scans `lib/game/entities/**/*.js` by default. The underlying CLI
also supports `--check` so CI or local scripts can detect drift without
rewriting files.

## Weltmeister Browser Cutover

`weltmeister.html` boots from `tools/weltmeister/main.js` and loads its CSS,
API endpoints, and editor assets from `tools/weltmeister/`. The editor UI now
uses first-party browser APIs instead of the retired bundled jQuery and jQuery
UI scripts.

Level format stays explicit through the target file path:

- saving to a `.js` path writes a native ESM level module
- saving to a `.json` path writes plain JSON
- new untitled levels default to `.js` because `tools/weltmeister/config.js`
  currently sets `project.outputFormat` to `esm`

Current ESM level modules embed the level JSON between `/*JSON[*/` markers,
register themselves through `ig.Game.registerLevel(...)`, and export the level
symbol plus its resource list.

## Generated Project Docs

`npm run module-graph` scans the live `lib/` tree plus `tools/weltmeister/`
and regenerates `docs/module-graph.json` plus `docs/module-graph.md`. Use it
after adding, removing, or moving modules if you want the generated graph docs
to stay in sync with the codebase.

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
ESM project. Use `npm run bake` for the current game build.
