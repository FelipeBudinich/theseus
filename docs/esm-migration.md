# ESM Migration Note

The native ESM migration now starts in `lib-esm/` and runs in parallel with the
legacy `lib/` tree. Live entrypoints stay on the legacy loader until a later PR.

## Conversion Rule For Future Modules

1. Import every dependency explicitly from `lib-esm/`.
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

Use `ig.module()`, `.requires()`, and `.defines()` only in the legacy tree. New
files in `lib-esm/` should stay native ESM from the start.

## Weltmeister Entity Manifest

The future ESM Weltmeister loader path now reads generated entity metadata from
`lib-esm/weltmeister/entity-manifest.js` instead of discovering entities through
the legacy synchronous `glob.php` request.

When you add, remove, or rename an ESM entity module, regenerate the manifest
with:

```sh
npm run build:weltmeister-entity-manifest
```

This also refreshes `lib-esm/weltmeister/entity-manifest.json`, which mirrors
the manifest contents in a debug-friendly format.
