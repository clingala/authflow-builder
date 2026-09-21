# Phase 11 — Export and integration system

Phase 11 makes saved AuthFlow projects portable without moving authentication secrets or security decisions into generated frontend code.

## Delivered

- Owner-authorized JSON downloads at `GET /api/v1/projects/:projectId/config/export`.
- A Next.js hosted-auth starter at the same endpoint with `?target=nextjs`.
- Strict schema parsing immediately before every export, even when the stored document was already validated at save time.
- Private, non-cacheable download responses with attachment filenames, version ETags, JSON content types, and `nosniff` protection.
- Builder actions for downloading the saved JSON configuration and the Next.js starter bundle.
- A framework-neutral export contract and adapter boundary for future React Native, Vue, and Angular targets.

## Export formats

The default download is the normalized AuthFlow configuration itself. It contains terminology, fields, branding, verification requirements, and provider enablement, but never provider credentials, OTP values, password hashes, reset tokens, or sessions.

The Next.js starter is a JSON bundle containing four text files:

- `authflow.config.json` — the validated configuration snapshot;
- `app/account/page.tsx` — a server component that redirects to the real project-scoped hosted authentication runtime;
- `.env.example` — the required public AuthFlow deployment origin;
- `README.md` — integration and secret-handling guidance.

The starter deliberately does not reproduce authentication primitives inside another application. Password hashing, OAuth state/PKCE, OTP delivery, recovery, sessions, and rate limits remain in the AuthFlow server runtime.

## Saved state versus drafts

Exports always represent the latest saved server version. Unsaved builder changes are excluded so a downloaded artifact cannot silently differ from the owner-authorized project record. The builder visibly reports unsaved changes before export.

## Testing

Automated coverage verifies configuration round-tripping, rejection of malformed stored data, deterministic generated files, secret-shaped data absence, and the builder’s project-scoped download links. The full quality gate continues to cover Prisma validation, strict lint, TypeScript, Vitest, and a production build.
