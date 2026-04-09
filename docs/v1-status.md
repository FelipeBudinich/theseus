# V1 Status

- The sample game page at `/` boots through native ESM from `lib/`.
- The sample game still runs directly from the Express static server with no bundler or extra build step.
- `test/esm-smoke.html` verifies the lower-level `lib/impact/ig.js` bootstrap path in a browser.
- `test/esm-engine-smoke.html` verifies the full `lib/impact/impact.js` engine entry, including `ig.main` and class-registry access.
- `npm run test:esm-engine` covers the ESM engine entry and the current level-registry behavior in Node-based tests.
- The live `lib/` tree now contains the ESM runtime; the legacy loader implementation has been retired.
- This note is historical; Weltmeister V2 is now documented in `docs/v2-status.md`.
