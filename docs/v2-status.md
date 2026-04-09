# V2 Status

- `/weltmeister.html` now boots from the native ESM entry at `lib/weltmeister/main.js`.
- The browser-side Weltmeister code, stylesheet, jQuery bundles, and editor image assets now all live under `lib/weltmeister/`.
- The editor still uses the existing jQuery-driven UI, so the migration did not require a framework rewrite.
- The Node/Express backend is now the complete Weltmeister backend; no PHP runtime is required.
- Weltmeister API requests now target `/lib/weltmeister/api/*.php`.
- Entity discovery on the ESM editor path now comes from the generated manifest in `lib/weltmeister/entity-manifest.js`.
- Level loading still accepts legacy module-wrapped `.js` files, and saving now supports both native ESM `.js` files and plain `.json` files.
