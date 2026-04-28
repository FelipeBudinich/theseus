# Status

Theseus is currently a native ESM + Node/Express port of the Impact.js sample
game and Weltmeister workflow.

## Runtime

- The live `lib/` tree contains the ESM runtime.
- `/` serves the source sample game entry from `index.html`.
- `index.html` loads `lib/game/bootstrap.js`, which imports the Impact debug
  panel before the game entry only when the URL uses `?debug` or `?debug=true`.
- `lib/game/bootstrap.js` then imports `lib/game/main.js`.
- `test/esm-smoke.html` verifies the lower-level `lib/impact/ig.js` bootstrap
  path in a browser.
- `test/esm-engine-smoke.html` verifies the full `lib/impact/impact.js` engine
  entry, including `ig.main` and class-registry access.
- `npm run test:esm-engine` covers the ESM engine entry and level-registry
  behavior in Node-based tests.

## Build And Serving

- The app runs directly from the Express static server with no development
  bundler requirement.
- `npm run bake` is the current production game build path and writes the Vite
  build to `dist/`.
- `/dist.html` serves the latest baked `dist/index.html` when it exists.
- `/dist.html` returns `404` with a `npm run bake` hint when no baked build is
  present.
- Built JavaScript is served from `/dist/assets/...`; runtime media and sounds
  still resolve from the source-hosted `/media/...` tree.
- The retired PHP bake helpers have been removed.

## Input

- `ig.input.bind()` expects string input codes.
- Keyboard bindings use `KeyboardEvent.code` strings such as `ArrowLeft`,
  `KeyX`, and `Space`.
- Mouse and wheel bindings use Theseus strings such as `MousePrimary`,
  `MouseSecondary`, `WheelUp`, and `WheelDown`.
- Gamepad bindings use logical controller slots such as `Gamepad0Left`,
  `Gamepad0FaceBottom`, and `Gamepad1Left`; generic gamepad names such as
  `GamepadLeft` are rejected.

## Weltmeister

- `/tools/weltmeister.html` boots from the native ESM entry at
  `tools/weltmeister/main.js`.
- The editor entry first calls `prepareWeltmeisterEntityState()` so entity
  modules are loaded from the generated manifest before the UI finishes booting.
- Browser-side Weltmeister code, stylesheet, and editor image assets live under
  `tools/weltmeister/`.
- The editor no longer loads jQuery or jQuery UI; its UI uses first-party browser
  APIs.
- The Node/Express backend is the complete Weltmeister backend; no PHP runtime
  is required.
- Weltmeister save requests target `/tools/weltmeister/api/save`.
- Image save requests target `/tools/weltmeister/api/save-image` and accept PNG
  data rooted under `media/`.
- File browsing targets `/tools/weltmeister/api/browse`.
- Former `/lib/weltmeister/*` routes, `/weltmeister.html`, and legacy
  `/tools/weltmeister/api/*.php` routes are intentionally left unmatched and
  return `404`.

## Entities And Levels

- Entity discovery on the ESM editor path comes from the generated manifest in
  `tools/weltmeister/entity-manifest.js`.
- The manifest generator scans `lib/game/entities/**/*.js` and also writes a
  JSON mirror to `tools/weltmeister/entity-manifest.json`.
- Regenerate the manifest after adding, removing, or renaming entity modules
  with `npm run build:weltmeister-entity-manifest`.
- Level loading supports native ESM `.js` level modules and plain `.json` level
  files.
- Level saving supports both formats. Saving to a `.js` path writes a native ESM
  level module; saving to a `.json` path writes plain JSON.
- New levels default to `lib/game/levels/*.js` because the current editor config
  sets `project.levelPath` to `lib/game/levels/` and `project.outputFormat` to
  `esm`.
- Current ESM level modules embed level JSON between `/*JSON[*/` markers,
  register themselves through `ig.Game.registerLevel(...)`, and export the level
  symbol plus its resource list.

## Tools

- `/tools/font-tool.html` serves the font atlas tool from the source tree.
- The font atlas tool writes `ig.Font`-compatible PNG atlases into `media/`
  through `/tools/weltmeister/api/save-image`.
