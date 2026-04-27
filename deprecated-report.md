# Deprecated Browser Support Report

Generated: 2026-04-27

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

## Executive Summary

- High-confidence deprecated-browser support remains in the live runtime and
  editor: MS pointer events, `msTouchAction`, `navigator.msMaxTouchPoints`,
  generic `ms`/`moz`/`webkit`/`o` property normalization, IE image scaling
  properties, and a Chrome 49 workaround.
- Medium-confidence compatibility residue remains in editor input/storage and
  CSS: `Function.prototype.bind` polyfill, old wheel/key event fallbacks, cookie
  fallback storage, and old prefixed style declarations.
- I did not find classic IE event/model support such as `attachEvent`,
  `detachEvent`, `ActiveXObject`, `XDomainRequest`, `document.all`, or IE
  conditional comments.
- The lowest-risk first cleanup is removing MS pointer support, then narrowing
  vendor-prefix helpers, then modernizing input/storage/CSS compatibility.

## High-Confidence Findings

| Priority | Location | Finding | Deprecated target | Modern direction |
| --- | --- | --- | --- | --- |
| P1 | `lib/impact/input.js:130-134` | Canvas input registers `MSPointerDown`, `MSPointerUp`, `MSPointerMove`, and writes `canvas.style.msTouchAction`. | IE10/IE11, old EdgeHTML, Windows Phone. | Remove these listeners and use the existing touch/mouse path, or migrate input to standard `pointerdown`/`pointerup`/`pointermove` plus `touch-action`. |
| P1 | `lib/impact/input.js:252-255` | `bindTouch()` also registers `MSPointerDown` and `MSPointerUp`. | IE10/IE11 and old EdgeHTML. | Remove the MS pointer registrations. If pointer events are desired, use unprefixed `pointerdown`/`pointerup`. |
| P1 | `lib/plugins/touch-button.js:78-96`, `lib/plugins/touch-button.js:142-145` | Touch buttons have dedicated `touchStartMS`/`touchEndMS` handlers, MS pointer listeners, and `document.body.style.msTouchAction`. | IE10/IE11, old EdgeHTML, Windows Phone. | Delete the MS-only handlers and listeners. Keep standard touch events or migrate the collection to unprefixed pointer events. |
| P1 | `lib/impact/ig.js:80-88` | User-agent detection includes `Windows Phone`, obsolete `iPhone4`, and touch detection checks `navigator.msMaxTouchPoints`. | Windows Phone and IE/EdgeHTML touch APIs. | Remove Windows Phone and `msMaxTouchPoints`; prefer feature detection such as `navigator.maxTouchPoints`, `PointerEvent`, or the existing touch-event check. |
| P1 | `lib/impact/core/vendor-attributes.js:4-10` | `vendorPropertyNames()` checks unprefixed plus `ms`, `moz`, `webkit`, and `o` properties for every normalized attribute. | Old IE, old Firefox, old WebKit, Opera Presto. | Remove the generic vendor prefix helper, or narrow it to a temporary local helper while deleting each prefixed consumer. |
| P1 | `lib/impact/ig.js:25` | `requestAnimationFrame` is normalized through the generic prefix helper before use. | `msRequestAnimationFrame`, `mozRequestAnimationFrame`, `webkitRequestAnimationFrame`, `oRequestAnimationFrame`. | Use unprefixed `window.requestAnimationFrame`; keep the `setInterval` fallback only if non-browser tests still need it. |
| P1 | `lib/impact/sound.js:517-518` | `AudioContext` is normalized through the generic prefix helper, enabling old `webkitAudioContext`-style support. | Old Safari/Chrome Web Audio implementations. | Use unprefixed `window.AudioContext` only for a modern-browser baseline. |
| P1 | `lib/impact/system.js:125-135` | Crisp scaling sets prefixed canvas smoothing and style properties, including `-moz-crisp-edges`, `-o-crisp-edges`, `-webkit-optimize-contrast`, and `msInterpolationMode`. | Old Firefox, old Opera, old WebKit, IE image interpolation. | Use `context.imageSmoothingEnabled = false` and modern `image-rendering` values such as `pixelated`/`crisp-edges`; drop `msInterpolationMode`. |
| P2 | `lib/impact/background-map.js:111-115` | Pre-rendered background chunks are converted from canvas to image for a documented Chrome 49 performance workaround. | Chrome 49-era rendering bug. | Re-test modern performance and remove the conversion if offscreen canvases are now acceptable. |
| P2 | `lib/impact/core/native-extensions.js:73-92` | Runtime installs a `Function.prototype.bind` polyfill. | Pre-ES5 browsers, especially old IE. | Remove under an ESM/modern-browser baseline. |

## Input API Compatibility Residue

These are not always browser-support branches, but they keep deprecated DOM input
APIs alive and overlap with old-browser compatibility.

| Priority | Location | Finding | Modern direction |
| --- | --- | --- | --- |
| P2 | `lib/weltmeister/evented-input.js:53-55` | Wheel direction uses `event.wheelDelta` and `event.detail`, the old `mousewheel`/`DOMMouseScroll` shape, even though the inherited listener is registered for standard `wheel`. | Use `event.deltaY`, matching `lib/impact/input.js:154-155`. |
| P2 | `lib/impact/input.js:194-196`, `lib/impact/input.js:224-226` | Keyboard binding relies on `event.keyCode`. | Move toward `event.code` or `event.key` while preserving the existing `ig.KEY` action map. |
| P2 | `lib/weltmeister/evented-input.js:17-19`, `lib/weltmeister/evented-input.js:39-41` | Weltmeister evented input also relies on `event.keyCode`. | Same as above. |
| P3 | `lib/weltmeister/edit-entities.js:37-40`, `lib/weltmeister/edit-entities.js:381-382`, `lib/weltmeister/weltmeister.js:179-182` | Editor keyboard handling mixes modern `event.key` with `event.which`/`event.keyCode` fallbacks. | Keep `event.key` for text commands and remove `which`/`keyCode` fallback once the input map is modernized. |

## Storage Compatibility Residue

| Priority | Location | Finding | Notes |
| --- | --- | --- | --- |
| P3 | `lib/weltmeister/storage.js:17-49`, `lib/weltmeister/storage.js:64-76`, `lib/weltmeister/storage.js:81-94` | Last-level storage has a legacy cookie fallback and migration path when `localStorage` is missing or throws. | Modern browsers support `localStorage`, but privacy settings can still make storage throw. Decide whether "modern browsers only" should still tolerate blocked storage before removing this. |
| P3 | `test/weltmeister-helpers.test.mjs:57` | Test coverage explicitly validates migration from the legacy cookie fallback into `localStorage`. | Update or delete this test if the cookie fallback is removed. |

## CSS Compatibility Residue

`lib/weltmeister/weltmeister.css` contains old prefixed CSS. Some entries are
true deprecated-browser support; others are vendor-specific styling that still
works in modern Chromium/Safari but is not portable.

| Priority | Location | Finding | Modern direction |
| --- | --- | --- | --- |
| P2 | `lib/weltmeister/weltmeister.css:96`, `:167`, `:177`, `:215`, `:316`, `:454`, `:471` | Uses `-webkit-transition` without the standard `transition` counterpart. | Replace with standard `transition`; remove old prefix. |
| P2 | `lib/weltmeister/weltmeister.css:334`, `:371` | Uses `-webkit-box-shadow` without standard `box-shadow`. | Replace with standard `box-shadow`. |
| P2 | `lib/weltmeister/weltmeister.css:411-413` | Header gradient uses old `-webkit-gradient`, `-moz-linear-gradient`, and `-o-linear-gradient` syntax. | Replace with standard `linear-gradient(...)`. |
| P2 | `lib/weltmeister/weltmeister.css:470` | Checkbox reset uses `-webkit-appearance: none`. | Use standard `appearance: none`; only keep the prefix if a specific current Safari target requires it. |
| P3 | `lib/weltmeister/weltmeister.css:9`, `:62`, `:168` | Uses `-webkit-font-smoothing`. | This is a non-standard rendering preference, not strictly deprecated-browser support. Keep only if the visual style depends on it. |
| P3 | `lib/weltmeister/weltmeister.css:486-491` | Uses `::-webkit-scrollbar` pseudo-elements. | This is current vendor-specific styling, not old-browser support. Keep only if WebKit/Blink-only scrollbar styling is acceptable. |

## Test Fixtures To Update During Cleanup

- `test/esm-engine-runtime.test.mjs:29` sets `navigator.msMaxTouchPoints`.
- `test/weltmeister-entity-manifest.test.mjs:35` sets `navigator.msMaxTouchPoints`.

If `ig.ua.touchDevice` switches to `navigator.maxTouchPoints` or pure feature
detection, these fixtures should be updated with the new modern shape.

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

1. Remove MS pointer support from `lib/impact/input.js` and
   `lib/plugins/touch-button.js`.
2. Replace `navigator.msMaxTouchPoints` with a modern touch/pointer detection
   policy, then update the two test fixtures.
3. Remove or narrow `vendor-attributes.js`; convert `requestAnimationFrame`,
   `AudioContext`, and canvas smoothing to unprefixed APIs.
4. Revisit the Chrome 49 background-map workaround with a modern performance
   smoke test.
5. Modernize input events (`deltaY`, `event.key`/`event.code`) and decide
   whether the cookie fallback remains valuable for blocked-storage scenarios.
6. Replace old prefixed Weltmeister CSS with standard properties.
