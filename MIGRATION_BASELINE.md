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

- The repo layout is unchanged: `index.html`, `weltmeister.html`, `lib/`, `media/`, and `tools/` all stay in place.
- `/` serves the existing `index.html`, which loads the current sample game exactly through the legacy browser script pipeline.
- Static assets under `lib/`, `media/`, and `tools/` are served directly by Express.
- `/weltmeister.html` loads the editor shell HTML, CSS, and JavaScript through Express without renaming or moving files.

## What still depends on legacy JS/PHP

- The engine and sample game still use the original legacy browser JavaScript files under `lib/impact/` and `lib/game/`.
- Weltmeister filesystem actions still depend on the PHP endpoints in `lib/weltmeister/api/` such as `save.php`, `browse.php`, and `glob.php`.
- The Express baseline serves files only; it does not execute PHP, so editor save/load/browse flows are not migrated in this PR.
- Legacy tooling under `tools/` that uses PHP remains unchanged and is not part of this baseline.
