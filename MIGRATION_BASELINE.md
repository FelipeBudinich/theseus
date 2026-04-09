# Migration Baseline

## Start the server

1. Run `npm install`
2. Run `npm start`

The server listens on `http://127.0.0.1:3000` by default and is also reachable at
`http://localhost:3000`. Set `PORT` to use a different port or `HOST` to change the bind address.

## URLs to open

- Sample game: `http://localhost:3000/`
- Weltmeister shell: `http://localhost:3000/weltmeister.html`

## What currently works

- The live repo layout is centered on `lib/`, alongside the existing top-level HTML files, `media/`, and `tools/`.
- `/` serves `index.html`, which loads the sample game directly from `lib/game/main.js`.
- Static assets under `lib/`, `media/`, and `tools/` are served directly by Express.
- `/weltmeister.html` loads the editor shell HTML, CSS, JavaScript, images, and backend routes through `lib/weltmeister/`.

## Historical leftovers

- The live `lib/` tree is now the ESM runtime; the old legacy `ig.module(...)` implementation has been retired.
- The Express baseline serves the Node-backed Weltmeister save API at `/lib/weltmeister/api/save` and browse API at `/lib/weltmeister/api/browse`; no PHP execution is required.
- `tools/` now mixes active maintenance scripts with archived reference utilities for the retired `ig.module(...)` bake workflow.
