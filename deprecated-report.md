# Deprecated Browser Support Report

Generated: 2026-04-27
Last updated: 2026-04-27 after Weltmeister CSS cleanup

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

## Status Update

Completed so far:

- Removed `MSPointerDown`, `MSPointerUp`, and `MSPointerMove` listeners from
  `lib/impact/input.js` and `lib/plugins/touch-button.js`.
- Removed `msTouchAction` writes and replaced the remaining touch-action intent
  with the standard `touchAction` style property.
- Removed dedicated `touchStartMS` and `touchEndMS` code from touch buttons.
- Replaced `navigator.msMaxTouchPoints` with a modern touch/pointer policy:
  touch events are detected with `ontouchstart`, and pointer-capable touch
  hardware is detected with unprefixed `PointerEvent` plus
  `navigator.maxTouchPoints`.
- Removed obsolete `ig.ua.winPhone` and `ig.ua.iPhone4` UA branches while
  updating the touch policy.
- Updated the two Node browser-like test fixtures from `msMaxTouchPoints` to
  `maxTouchPoints`.
- Deleted the generic `lib/impact/core/vendor-attributes.js` helper and removed
  its attachment from `ig`.
- Converted `requestAnimationFrame`, `AudioContext`, canvas smoothing,
  image-pixel reads, and gamepad detection to unprefixed APIs.
- Regenerated `docs/module-graph.md` and `docs/module-graph.json` after
  removing the helper module.
- Replaced old prefixed Weltmeister CSS with standard properties: transitions,
  box shadows, gradient syntax, checkbox appearance, user selection, canvas
  image rendering, and scrollbar styling now use standard declarations.
- Removed non-standard `-webkit-font-smoothing` declarations from
  `lib/weltmeister/weltmeister.css`.

After this pass, `MSPointer`, `msTouchAction`, `msMaxTouchPoints`, `winPhone`,
`iPhone4`, `vendor-attributes`, `setVendorAttribute`, `getVendorAttribute`,
`normalizeVendorAttribute`, and old prefixed Weltmeister CSS declarations no
longer appear in source or tests outside this report.

## Current Summary

- High-confidence deprecated-browser support still remains in the Chrome 49
  background-map workaround and the `Function.prototype.bind` polyfill.
- Medium-confidence compatibility residue remains in editor input/storage: old
  wheel/key event fallbacks and cookie fallback storage.
- I did not find classic IE event/model support such as `attachEvent`,
  `detachEvent`, `ActiveXObject`, `XDomainRequest`, `document.all`, or IE
  conditional comments.

## Completed Findings

| Location | Former finding | Current state |
| --- | --- | --- |
| `lib/impact/input.js:123-129` | Canvas input registered MS pointer listeners and wrote `msTouchAction`. | Standard touch listeners remain; MS listeners were removed and `touchAction` is now used. |
| `lib/impact/input.js:242-248` | `bindTouch()` registered MS pointer listeners. | Only standard `touchstart`/`touchend` listeners remain. |
| `lib/plugins/touch-button.js:50-76`, `lib/plugins/touch-button.js:115-123` | Touch buttons had MS pointer handlers, MS listeners, and `document.body.style.msTouchAction`. | MS handlers/listeners were deleted; the collection now uses standard touch events and `touchAction`. |
| `lib/impact/ig.js:80-91` | UA detection included Windows Phone, obsolete iPhone 4, and `navigator.msMaxTouchPoints`. | Windows Phone/iPhone 4 branches were removed; touch detection now uses `ontouchstart`, `PointerEvent`, and `navigator.maxTouchPoints`. |
| `test/esm-engine-runtime.test.mjs:29`, `test/weltmeister-entity-manifest.test.mjs:35` | Browser-like fixtures set `navigator.msMaxTouchPoints`. | Fixtures now set `navigator.maxTouchPoints`. |
| `lib/impact/core/vendor-attributes.js` | Generic vendor helper normalized `ms`, `moz`, `webkit`, and `o` property names. | File was deleted; no runtime helper is attached to `ig`. |
| `lib/impact/ig.js:24-41` | Animation setup normalized prefixed `requestAnimationFrame`. | Uses only unprefixed `requestAnimationFrame`, with the existing interval fallback for non-browser/test environments. |
| `lib/impact/ig.js:180-186` | Image pixel reads checked old backing-store ratios and `getImageDataHD`. | Uses unprefixed `drawImage()` plus `getImageData()` directly. |
| `lib/impact/sound.js:517` | WebAudio setup normalized prefixed `AudioContext`. | Uses only unprefixed `window.AudioContext`. |
| `lib/impact/system.js:124-130` | Canvas scaling wrote prefixed smoothing/image-rendering properties and `msInterpolationMode`. | Uses `context.imageSmoothingEnabled` and standard `imageRendering = 'pixelated'`. |
| `lib/plugins/gamepad.js:23-32` | Gamepad setup normalized prefixed `getGamepads`. | Uses only unprefixed `navigator.getGamepads`. |
| `lib/weltmeister/weltmeister.css` | Stylesheet used old `-webkit-*`, `-moz-*`, and `-o-*` declarations for transitions, box shadows, gradients, checkbox appearance, font smoothing, canvas interpolation, user selection, and scrollbars. | Replaced with standard `transition`, `box-shadow`, `linear-gradient`, `appearance`, `user-select`, `image-rendering`, `scrollbar-color`, and `scrollbar-width`; removed `-webkit-font-smoothing`. |

## Remaining High-Confidence Findings

| Priority | Location | Finding | Deprecated target | Modern direction |
| --- | --- | --- | --- | --- |
| P2 | `lib/impact/background-map.js:111-115` | Pre-rendered background chunks are converted from canvas to image for a documented Chrome 49 performance workaround. | Chrome 49-era rendering bug. | Re-test modern performance and remove the conversion if offscreen canvases are now acceptable. |
| P2 | `lib/impact/core/native-extensions.js:73-92` | Runtime installs a `Function.prototype.bind` polyfill. | Pre-ES5 browsers, especially old IE. | Remove under an ESM/modern-browser baseline. |

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

1. Done: remove MS pointer support from `lib/impact/input.js` and
   `lib/plugins/touch-button.js`.
2. Done: replace `navigator.msMaxTouchPoints` with a modern touch/pointer
   detection policy and update the two test fixtures.
3. Done: remove `vendor-attributes.js`; convert `requestAnimationFrame`,
   `AudioContext`, canvas smoothing, image pixel reads, and gamepad detection to
   unprefixed APIs.
4. Done: replace old prefixed Weltmeister CSS with standard properties.
5. Modernize input events (`deltaY`, `event.key`/`event.code`) and decide
   whether the cookie fallback remains valuable for blocked-storage scenarios.
6. Revisit the Chrome 49 background-map workaround with a modern performance
   smoke test.
