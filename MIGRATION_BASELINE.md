# Migration Baseline

## Start and verify the project

1. Run `npm install`
2. Run `npm start` for the normal server, or `npm run dev` to restart on changes
3. Run `npm test` to verify the current runtime, editor API, manifest generation, and level-format behavior

The server listens on `http://127.0.0.1:3000` by default and is also reachable at
`http://localhost:3000`. Set `PORT` to use a different port or `HOST` to change the bind address.

## URLs to open

- Sample game: `http://localhost:3000/`
- Latest baked game: `http://localhost:3000/dist.html`
- Weltmeister shell: `http://localhost:3000/weltmeister.html`
- ESM bootstrap smoke page: `http://localhost:3000/esm-smoke.html`
- ESM engine smoke page: `http://localhost:3000/esm-engine-smoke.html`

## What currently works

- The live repo layout is centered on `lib/`, alongside the existing top-level HTML files, `media/`, and `tools/`.
- `/` serves `index.html`, which loads the sample game directly from `lib/game/main.js`.
- `weltmeister.html` loads the editor shell from `lib/weltmeister/main.js`, which prepares entity metadata from the generated manifest before booting the editor.
- Static assets under `lib/`, `media/`, and `tools/` are served directly by Express.
- The Node/Express server mounts the Weltmeister backend at `/lib/weltmeister/api`, with `/save` for writes and `/browse` for file listings.
- `/` serves the source `index.html`, while `/dist.html` serves the latest Vite build from `dist/index.html` when present.
- Weltmeister edits `lib/game/levels/` by default. Saving to a `.js` path writes a native ESM level module, while saving to a `.json` path writes plain JSON.

## Active maintenance scripts

- `npm run bake` builds the sample game from `index.html` into `dist/` with browser asset URLs rooted at `/dist/`.
- `npm run build:weltmeister-entity-manifest` regenerates `lib/weltmeister/entity-manifest.js` and `lib/weltmeister/entity-manifest.json` from `lib/game/entities/**/*.js`.
- `npm run module-graph` regenerates `docs/module-graph.json` and `docs/module-graph.md` from the live `lib/` tree.
- The test suite covers the ESM engine entry, live pathing, Weltmeister API behavior, the generated entity manifest, the editor HTML shell, and level-format helpers.

## Historical leftovers

- The live `lib/` tree is now the ESM runtime; the old legacy `ig.module(...)` implementation has been retired.
- The Express baseline serves the Node-backed Weltmeister save API at `/lib/weltmeister/api/save` and browse API at `/lib/weltmeister/api/browse`; legacy `.php` editor endpoints are intentionally not served.
- `tools/` now mixes active maintenance scripts with archived reference utilities for the retired `ig.module(...)` bake workflow.
