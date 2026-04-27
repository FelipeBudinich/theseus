# Theseus

Theseus is an HTML5 game engine port of Impact.js that keeps the classic API and Weltmeister workflow running on a native ESM + Node/Express baseline.

More info & documentation about the original engine: http://impactjs.com/

Impact was published under the [MIT Open Source License](http://opensource.org/licenses/mit-license.php).

## Getting started

1. Run `npm install` to setup your local copy.
2. Run `npm start` for the normal server, or `npm run dev` to restart on changes.
3. Run `npm run bake` builds the sample game from `index.html` into `dist/`.

The server listens on `http://127.0.0.1:3000` by default and is also reachable at `http://localhost:3000`.
Set `PORT` to use a different port or `HOST` on `server.mjs` to change the bind address.

## Useful URLs

- Sample game: `http://localhost:3000/`
- Latest baked game: `http://localhost:3000/dist.html`
- Weltmeister shell: `http://localhost:3000/weltmeister.html` loads the editor shell from `lib/weltmeister/main.js`, which prepares entity metadata from the generated manifest before booting the editor.
- Font atlas tool: `http://localhost:3000/font-tool.html` generates `ig.Font`-compatible PNG atlases from local or fallback CSS fonts, validates the metric row, and saves the result into `media/`.

## Changes in this port

- The live `lib/` tree is now the ESM runtime; the legacy `ig.module(...)` implementation has been retired.
- `/dist.html` serves the latest Vite build from `dist/index.html` when present.
- Weltmeister edits `lib/game/levels/` by default and runs without jQuery. Saving to a `.js` path writes a native ESM level module, while saving to a `.json` path writes plain JSON.
- `npm run module-graph` regenerates `docs/module-graph.json` and `docs/module-graph.md` from the live `lib/` tree.
