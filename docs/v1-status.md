# V1 Status

- The sample game page at `/` boots through native ESM from `lib/`.
- The sample game still runs directly from the Express static server with no bundler or extra build step.
- The live `lib/` tree now contains the ESM runtime; the legacy loader implementation has been retired.
- This note is historical; Weltmeister V2 is now documented in `docs/v2-status.md`.
