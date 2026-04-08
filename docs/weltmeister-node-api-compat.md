# Weltmeister Node API Compatibility Notes

- The editor still talks to `lib/weltmeister/api/save.php`, `browse.php`, and `glob.php`; the Node server now answers those URLs directly so the browser-side config does not change.
- `save.php` intentionally preserves the legacy `application/x-www-form-urlencoded` contract, but it now accepts both `.js` and `.json` level files and uses a larger request-body limit for real editor saves.
- Path traversal is handled with the same legacy-style `..` stripping, but all filesystem access stays rooted inside the project directory.
- `browse.php` keeps the legacy `type=images` and `type=scripts` filters, still returns project-relative paths, and now includes `.json` files in the `scripts` view so Weltmeister can browse both supported level formats.
- `weltmeister.html` now boots from `lib-esm/weltmeister/main.js`; no PHP runtime is required for the editor anymore.
