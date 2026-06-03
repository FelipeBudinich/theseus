# Debug Entry

Defined in Module `public/lib/impact/debug/debug.js`

The debug entry module imports the concrete debug panels and exports nothing.
It exists so `ig.js` can load the whole debug suite with one dynamic import.

## Synopsis

```js
// Loaded automatically by ig.js when the URL uses ?debug or ?debug=true.
import '/lib/impact/debug/debug.js';
```

## Description

The module imports:

- `debug/entities-panel.js`
- `debug/maps-panel.js`
- `debug/graph-panel.js`

Each imported panel depends on `debug/menu.js`, which creates `ig.debug` and
the shared debug UI classes when needed.

## Public API

This module has no public classes or methods of its own. Its side effect is
installing debug injections and panels through the imported modules.

## Theseus Notes

`public/lib/impact/ig.js` loads this module only when debug is requested by URL
and `globalThis.__THESEUS_INCLUDE_DEBUG__` is not `false`. `impact.js` awaits
that decision before `ig.main()` is exposed to game code.
