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
`tools/weltmeister.html`, and the smoke tests load ESM with `<script type="module">`,
and the runtime uses syntax that old browsers cannot parse. There is no explicit
`browserslist` entry or Vite `build.target` documenting that baseline.

## Current Summary

- No high-confidence deprecated-browser support remains from the current scan.
- No medium-confidence compatibility residue remains in editor input handling.
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
| None | - | No remaining live editor UI shortcut compatibility residue. | Continue using `KeyboardEvent.key` for text-entry commands and `KeyboardEvent.code` for editor/game-style shortcuts. |

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

1. Consider a separate `OffscreenCanvas` migration audit for pre-rendered
   background chunks after confirming DOM-canvas assumptions.
