# V1 Status

- The sample game page at `/` now boots through native ESM from `lib-esm/` and no longer depends on the legacy `ig.module(...)` runtime loader path.
- The sample game still runs directly from the Express static server with no bundler or extra build step.
- `weltmeister.html` is still on the legacy browser and PHP-backed path in this version.
- V2 will port Weltmeister to the Node-backed server path first and then migrate it to ESM.
