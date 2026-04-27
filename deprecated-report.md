# Deprecated Browser Support Report

Generated: 2026-04-27
Last updated: 2026-04-27 after removing the Chrome 49 background-map workaround

## Scope

I scanned the live project files under `lib/`, `tools/`, top-level HTML files,
tests, and docs for deprecated-browser compatibility code. I excluded
`node_modules` and `package-lock.json`.

Search themes included IE/MS APIs, old vendor prefixes, browser UA sniffing,
polyfills, old input event fallbacks, and explicit browser workarounds.

The current app already assumes a modern baseline in practice: `index.html`,
`weltmeister.html`, and the smoke tests load ESM with `<script type="module">`,
and the runtime uses syntax that old browsers cannot parse. There is no explicit
`browserslist` entry or Vite `build.target` documenting that baseline.

## Current Summary

- No high-confidence deprecated-browser support remains from the current scan.
- Medium-confidence compatibility residue remains in editor input handling: old
  key event fallbacks.
- I did not find classic IE event/model support such as `attachEvent`,
  `detachEvent`, `ActiveXObject`, `XDomainRequest`, `document.all`, or IE
  conditional comments.

## High-Confidence Findings

None remaining.

## Rendering Follow-Up

- `lib/impact/background-map.js` now returns its existing off-DOM
  `HTMLCanvasElement` chunks directly instead of converting them through
  `toDataURL()` for a Chrome 49-era workaround. A future rendering audit could
  consider migrating this path to the newer `OffscreenCanvas` class, but that
  should stay separate from this cleanup because it needs checks around
  `ig.System.scaleMode()`, Ejecta-related canvas assumptions, and any code
  expecting DOM canvas properties.

## Input API Compatibility Residue

These are not always browser-support branches, but they keep deprecated DOM input
APIs alive and overlap with old-browser compatibility.

| Priority | Location | Finding | Modern direction |
| --- | --- | --- | --- |
| P3 | `lib/weltmeister/edit-entities.js:37-40`, `lib/weltmeister/edit-entities.js:381-382`, `lib/weltmeister/weltmeister.js:179-182` | Editor UI shortcut handling mixes modern `event.key` with `event.which`/`event.keyCode` fallbacks outside the main input binding path. | Keep `event.key` for text commands and remove the fallback once those UI shortcuts are modernized. |

## Explicit Non-Findings

- No `attachEvent`, `detachEvent`, `ActiveXObject`, `XDomainRequest`,
  `document.all`, or IE conditional comments were found.
- `tools/font-tool.js` has a fallback when `queryLocalFonts()` is missing. That
  supports current non-Chromium browsers, so I did not classify it as deprecated
  browser support.
- `lib/impact/sound.js` still probes audio formats with `canPlayType()` and can
  use HTML audio. That is normal capability detection, not specifically
  deprecated-browser support.

## Suggested Cleanup Order

1. Remove the remaining Weltmeister UI shortcut `event.which`/`event.keyCode` fallbacks.
2. Consider a separate `OffscreenCanvas` migration audit for pre-rendered
   background chunks after confirming DOM-canvas assumptions.
