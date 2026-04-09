# V2 Status

- `/weltmeister.html` now boots from the native ESM entry at `lib/weltmeister/main.js`.
- The editor entry first calls `prepareWeltmeisterEntityState()` so entity modules are loaded from the generated manifest before the UI finishes booting.
- The browser-side Weltmeister code, stylesheet, jQuery bundles, and editor image assets now all live under `lib/weltmeister/`.
- The editor still uses the existing jQuery-driven UI, so the migration did not require a framework rewrite.
- The Node/Express backend is now the complete Weltmeister backend; no PHP runtime is required.
- Weltmeister save requests now target `/lib/weltmeister/api/save`, while file browsing now uses `/lib/weltmeister/api/browse`.
- Legacy `/lib/weltmeister/api/*.php` routes are intentionally left unmatched and return `404`.
- Entity discovery on the ESM editor path now comes from the generated manifest in `lib/weltmeister/entity-manifest.js`.
- The manifest generator scans `lib/game/entities/**/*.js` and also writes a JSON mirror to `lib/weltmeister/entity-manifest.json`.
- Level loading supports native ESM `.js` level modules and plain `.json` level files, and saving supports both formats.
- New levels default to `lib/game/levels/*.js` because the current editor config sets `project.levelPath` to `lib/game/levels/` and `project.outputFormat` to `esm`.
