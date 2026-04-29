# Theseus

Theseus is an HTML5 game engine port of Impact.js that keeps the classic API and Weltmeister workflow running on a native ESM + Node/Express baseline.

More info & documentation about the original engine: http://impactjs.com/

Impact was published under the [MIT Open Source License](http://opensource.org/licenses/mit-license.php).

## Getting started

1. Run `npm install` to setup your local copy.
2. Run `npm start` for the normal server, or `npm run dev` to restart on changes.
3. Run `npm run bake` to build the sample game from `public/index.html` into `public/dist/`.

The server listens on `http://127.0.0.1:3000` by default and is also reachable at `http://localhost:3000`.
Set `PORT` to use a different port or `HOST` on `server.mjs` to change the bind address.

## Useful URLs

- Sample game: `http://localhost:3000/`
- Sample game with Impact debug panel: `http://localhost:3000/?debug` or `http://localhost:3000/?debug=true`
- Latest baked game: `http://localhost:3000/dist.html`
- Latest baked game with debug query ignored: `http://localhost:3000/dist.html?debug`
- Weltmeister shell: `http://localhost:3000/tools/weltmeister.html` loads the editor shell from `tools/weltmeister/main.js`, which prepares entity metadata from the generated manifest before booting the editor.
- Font atlas tool: `http://localhost:3000/tools/font-tool.html` generates `ig.Font`-compatible PNG atlases from local or fallback CSS fonts, validates the metric row, and saves the result into `media/`.

## Changes in this port

- The live ESM runtime lives under `public/lib/`, but browser URLs remain `/lib/...` because `public/` is the server static root.
- `public/index.html` loads the game entry directly from `lib/game/main.js`; `impact.js` waits for the URL-controlled debug decision before exposing the booted engine. The debug panel is enabled only by `?debug` or `?debug=true` in the source-served game; baked builds intentionally exclude the debug panel.
- `ig.input.bind()` now uses string input codes instead of `ig.KEY` or `ig.GAMEPAD` constants. Keyboard bindings use `KeyboardEvent.code` values such as `ArrowLeft`, `KeyX`, and `Space`; mouse and wheel bindings use Theseus strings such as `MousePrimary`, `MouseSecondary`, `WheelUp`, and `WheelDown`.
- Gamepad bindings are string-based logical controller slots. Use `Gamepad0Left`, `Gamepad0FaceBottom`, `Gamepad1Left`, etc.; generic gamepad names such as `GamepadLeft` are intentionally rejected.
- `/dist.html` serves the latest Vite build from `public/dist/index.html` when present.
- Weltmeister still edits `lib/game/levels/` by default, and the server resolves that to `public/lib/game/levels/` on disk. Saving to a `.js` path writes a native ESM level module, while saving to a `.json` path writes plain JSON.

Example input bindings:

```js
ig.input.bind('ArrowLeft', 'left');
ig.input.bind('KeyX', 'jump');
ig.input.bind('MousePrimary', 'shoot');
ig.input.bind('WheelUp', 'zoomIn');

ig.input.bind('Gamepad0Left', 'left');
ig.input.bind('Gamepad0FaceBottom', 'jump');
ig.input.bind('Gamepad1Left', 'p2-left');
```
