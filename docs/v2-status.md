# V2 Status

- `/weltmeister.html` now boots from the native ESM entry at `lib-esm/weltmeister/main.js`.
- The browser-side Weltmeister code now lives under `lib-esm/weltmeister/` and no longer depends on the legacy `ig.module(...)` loader path.
- The editor still uses the existing jQuery-driven UI, so the migration did not require a framework rewrite.
- The Node/Express backend is now the complete Weltmeister backend; no PHP runtime is required.
- Entity discovery on the ESM editor path now comes from the generated manifest in `lib-esm/weltmeister/entity-manifest.js`.
- Level loading still accepts legacy module-wrapped `.js` files, and saving now supports both native ESM `.js` files and plain `.json` files.
