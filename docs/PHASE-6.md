# Phase 6 delivery — Recoverable live-preview workflow

Phase 6 hardens the visual builder against interrupted sessions and concurrent edits. Local changes remain previews until the owner explicitly saves; the browser checkpoint is recovery infrastructure, not an automatic production configuration write.

## Delivered

- Project-scoped browser checkpoints for unsaved validated configuration drafts.
- A restore/delete recovery banner shown after reload or an interrupted editing session.
- Stored-draft validation through the full AuthFlow schema before any recovered data reaches the renderer.
- Draft format, project identity, base revision, and timestamp validation with automatic rejection of malformed storage.
- Safe handling for stale drafts: drafts based on an older server revision are identified but cannot overwrite the current project.
- Debounced, best-effort local checkpoints that tolerate unavailable or full browser storage.
- Optimistic-concurrency recovery that preserves the local draft, reports the current server version, and lets the owner explicitly replace the draft with the latest validated server configuration.
- Cleanup of local checkpoints after save, discard, recovery deletion, or loading the latest server version.

## Security and data boundary

The checkpoint contains only the AuthFlow project configuration, which is already designed for export and never contains passwords, OAuth client secrets, OTP values, reset tokens, session data, or end-user submissions. Browser storage is treated as untrusted: every recovered document is parsed and semantically validated before use. Server ownership, origin protection, schema validation, and optimistic revision checks remain authoritative.

## Main files

```text
src/modules/builder/draft-storage.ts
src/modules/builder/use-auth-builder.ts
src/modules/builder/auth-flow-builder.tsx
src/modules/builder/auth-flow-builder.test.tsx
src/app/globals.css
```

## Testing

Coverage includes checkpoint creation, same-revision recovery, stale-revision blocking, malformed-storage removal, successful versioned saves, conflict preservation, and explicit loading of the latest server version. Browser QA verified a real interruption/reload/restore/save sequence and a real two-tab revision conflict against PostgreSQL.

## Deferred

Phase 7 will implement generated end-user email/password authentication using maintained framework primitives and separate tenant-scoped runtime identities. Verification, recovery, and OAuth execution remain deferred to their dedicated phases; no simulated success paths were added here.
