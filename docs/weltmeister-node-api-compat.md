# Weltmeister Node API Compatibility Notes

- The editor still talks to `lib/weltmeister/api/save.php`, `browse.php`, and `glob.php`; the Node server now answers those URLs directly so the browser-side config does not change.
- `save.php` intentionally preserves the legacy `application/x-www-form-urlencoded` contract and still refuses to write anything that does not end in `.js`.
- Path traversal is handled with the same legacy-style `..` stripping, but all filesystem access stays rooted inside the project directory.
- `browse.php` keeps the legacy `type=images` and `type=scripts` filters and still returns project-relative paths.
