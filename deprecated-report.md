# Deprecated Browser Support Report

Generated: 2026-04-27
Last updated: 2026-04-27 with resolved items removed

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

- High-confidence deprecated-browser support still remains in the Chrome 49
  background-map workaround.
- Medium-confidence compatibility residue remains in editor input/storage: old
  wheel/key event fallbacks and cookie fallback storage.
- I did not find classic IE event/model support such as `attachEvent`,
  `detachEvent`, `ActiveXObject`, `XDomainRequest`, `document.all`, or IE
  conditional comments.

## High-Confidence Findings

| Priority | Location | Finding | Deprecated target | Modern direction |
| --- | --- | --- | --- | --- |
| P2 | `lib/impact/background-map.js:111-115` | Pre-rendered background chunks are converted from canvas to image for a documented Chrome 49 performance workaround. | Chrome 49-era rendering bug. | Re-test modern performance and remove the conversion if offscreen canvases are now acceptable. |

## Input API Compatibility Residue

These are not always browser-support branches, but they keep deprecated DOM input
APIs alive and overlap with old-browser compatibility.

| Priority | Location | Finding | Modern direction |
| --- | --- | --- | --- |
| P2 | `lib/weltmeister/evented-input.js:53-55` | Wheel direction uses `event.wheelDelta` and `event.detail`, the old `mousewheel`/`DOMMouseScroll` shape, even though the inherited listener is registered for standard `wheel`. | Use `event.deltaY`, matching `lib/impact/input.js:148-149`. |
| P2 | `lib/impact/input.js:188-190`, `lib/impact/input.js:218-220` | Keyboard binding relies on `event.keyCode`. | Move toward `event.code` or `event.key` while preserving the existing `ig.KEY` action map. |
| P2 | `lib/weltmeister/evented-input.js:17-19`, `lib/weltmeister/evented-input.js:39-41` | Weltmeister evented input also relies on `event.keyCode`. | Same as above. |
| P3 | `lib/weltmeister/edit-entities.js:37-40`, `lib/weltmeister/edit-entities.js:381-382`, `lib/weltmeister/weltmeister.js:179-182` | Editor keyboard handling mixes modern `event.key` with `event.which`/`event.keyCode` fallbacks. | Keep `event.key` for text commands and remove `which`/`keyCode` fallback once the input map is modernized. |

## Storage Compatibility Residue

| Priority | Location | Finding | Notes |
| --- | --- | --- | --- |
| P3 | `lib/weltmeister/storage.js:17-49`, `lib/weltmeister/storage.js:64-76`, `lib/weltmeister/storage.js:81-94` | Last-level storage has a legacy cookie fallback and migration path when `localStorage` is missing or throws. | Modern browsers support `localStorage`, but privacy settings can still make storage throw. Decide whether "modern browsers only" should still tolerate blocked storage before removing this. |
| P3 | `test/weltmeister-helpers.test.mjs:57` | Test coverage explicitly validates migration from the legacy cookie fallback into `localStorage`. | Update or delete this test if the cookie fallback is removed. |

## Explicit Non-Findings

- No `attachEvent`, `detachEvent`, `ActiveXObject`, `XDomainRequest`,
  `document.all`, or IE conditional comments were found.
- `tools/font-tool.js` has a fallback when `queryLocalFonts()` is missing. That
  supports current non-Chromium browsers, so I did not classify it as deprecated
  browser support.
- `lib/impact/sound.js` still probes audio formats with `canPlayType()` and can
  use HTML audio. That is normal capability detection, not specifically
  deprecated-browser support.
- Docs/tests mentioning "legacy" often refer to the Impact `ig.module(...)`
  migration or Weltmeister API compatibility, not browser support.

## Suggested Cleanup Order

1. Modernize input events (`deltaY`, `event.key`/`event.code`) and decide
   whether the cookie fallback remains valuable for blocked-storage scenarios.
2. Revisit the Chrome 49 background-map workaround with a modern performance
   smoke test.
