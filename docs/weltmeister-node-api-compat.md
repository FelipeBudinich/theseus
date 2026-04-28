# Weltmeister Node API Notes

- The editor now talks to `/tools/weltmeister/api/save` for saves and `/tools/weltmeister/api/browse` for file browsing; the Node server answers those routes directly.
- The Express app mounts the API router before static-file serving, and `createApp()` accepts custom `projectRoot`, `staticRoot`, and `distRoot` values so tests can point the API and baked route at temporary trees.

## Save route

- `POST /tools/weltmeister/api/save` accepts JSON `{ path, data }` payloads.
- The request body is parsed with Express JSON middleware and currently capped at `10mb`.
- Writes are allowed only for `.js` and `.json` targets.
- Path traversal is handled with the same legacy-style `..` stripping, but the resolved write still stays rooted inside the configured project directory.
- Successful writes return `200` with `{ "ok": true }`.
- Validation failures return `400` with `{ "error": "..." }`, while write failures return `500` with the same JSON error shape.

## Browse route

- `/tools/weltmeister/api/browse` responds on any HTTP method, matching the existing editor usage.
- The route still supports the legacy `dir` and `type` query parameters.
- `type=images` includes `.png`, `.gif`, `.jpg`, and `.jpeg`.
- `type=scripts` includes `.js` and `.json`, which lets the editor browse both supported level-file formats.
- Browse responses keep the legacy `{ parent, dirs, files }` shape, hide dotfiles, and return project-relative POSIX-style paths in lexicographic order.

## Removed legacy routes

- `/lib/weltmeister/*` is intentionally not served by the Node app and returns `404`.
- `/tools/weltmeister/api/glob.php`, `/tools/weltmeister/api/save.php`, and `/tools/weltmeister/api/browse.php` are intentionally not served by the Node app and currently return `404`.
- `tools/weltmeister.html` now boots from `tools/weltmeister/main.js`; no PHP runtime is required for the editor anymore.

## Source And Baked Game Routes

- `/` still serves the source `index.html` from the repo root.
- `/dist.html` serves `dist/index.html` when a baked build exists and returns `404` with a bake hint when it does not.
- Built JavaScript is served from `/dist/assets/...`, while the game continues loading runtime media from the source `/media/...` tree.
