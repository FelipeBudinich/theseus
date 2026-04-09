# Weltmeister Node API Compatibility Notes

- The editor now talks to `lib/weltmeister/api/save` for saves and `lib/weltmeister/api/browse` for file browsing; the Node server answers those URLs directly.
- The save endpoint now accepts JSON `{ path, data }` payloads and returns HTTP status-based errors with a JSON `{ error }` message.
- Path traversal is handled with the same legacy-style `..` stripping, but all filesystem access stays rooted inside the project directory.
- The browse endpoint keeps the legacy `type=images` and `type=scripts` filters, still returns project-relative paths, and includes `.json` files in the `scripts` view so Weltmeister can browse both supported level formats.
- `weltmeister.html` now boots from `lib/weltmeister/main.js`; no PHP runtime is required for the editor anymore.
