# Weltmeister jQuery Removal Notes

Weltmeister no longer depends on jQuery or jQuery UI at runtime.

## Implemented Shape

- `weltmeister.html` loads only `lib/weltmeister/main.js` after the editor CSS.
- `lib/weltmeister/wm.js` exports the shared `wm` namespace and `globalScope`;
  it no longer checks for `window.$` or `window.jQuery`.
- DOM selection, events, visibility, animation, request, storage, and layer
  ordering are handled by small first-party helpers under `lib/weltmeister/`.
- Level loading, saving, and file browsing use `fetch()` while preserving the
  save error shape expected by existing alert handling.
- Last-level persistence uses `localStorage` with a legacy cookie fallback.
- Layer reordering uses the dependency-free `LayerSorter` helper and keeps DOM
  order as the source of truth for foreground and background semantics.

## Removed Assets

- `lib/weltmeister/jquery-1.7.1.min.js`
- `lib/weltmeister/jquery-ui-1.8.1.custom.min.js`

## Verification Targets

- The editor should boot with no `window.$` or `window.jQuery`.
- Load/save dialogs, file dropdowns, layer add/delete/reorder, visibility
  toggles, entity setting edits, zoom feedback, sidebar toggling, and
  beforeunload handling should work through native browser APIs.
- `test/weltmeister-html.test.mjs` should assert the jQuery scripts are absent.
- `test/weltmeister-helpers.test.mjs` should cover request errors, storage
  fallback, and layer ordering.
