# ESM Migration Note

The native ESM migration is now complete in the live repo layout: browser and
editor entrypoints load only from `lib/`, and the legacy `ig.module(...)`
runtime has been retired.

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

## Weltmeister Entity Manifest

The live Weltmeister loader path reads generated entity metadata from
`lib/weltmeister/entity-manifest.js`.

When you add, remove, or rename an ESM entity module, regenerate the manifest
with:

```sh
npm run build:weltmeister-entity-manifest
```

This also refreshes `lib/weltmeister/entity-manifest.json`, which mirrors
the manifest contents in a debug-friendly format.

## Weltmeister Browser Cutover

`weltmeister.html` boots from `lib/weltmeister/main.js` and loads its CSS,
jQuery bundles, API endpoints, and editor assets from the same `lib/`
tree. The existing jQuery-driven UI is still in place; only the file layout and
runtime pathing changed.

Level format stays explicit through the target file path:

- saving to a `.js` path writes a native ESM level module
- saving to a `.json` path writes plain JSON

## Historical Tooling

The active maintenance scripts now live in `tools/`, alongside the archived
`tools/bake.*` helpers for the retired `ig.module(...)` workflow. The bake
helpers remain historical reference only and are not compatible with the
current ESM `lib/` runtime.
