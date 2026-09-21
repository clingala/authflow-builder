# AuthFlow Builder — MVP architecture and implementation plan

Status: accepted implementation plan, 2026-09-20. Phases 1 through 7 are implemented in this repository.

## 1. Final MVP feature list

The MVP supports owner accounts; project create/list/read/update; an account-type label; configurable login, signup, and recovery terminology; email/password identifiers; ordered standard or custom registration fields; non-executable validation rules; email verification; a phone OTP adapter contract; a Google OAuth adapter contract; password policy and recovery configuration; consent fields; branding; desktop/mobile previews; save and validated JSON export; a reusable React/Next.js renderer; and owner-authorized structured tools.

Not in MVP: real LinkedIn/Facebook adapters, SAML/SCIM, enterprise SSO, passkeys, MFA apps, conditional/multi-step signup, SDKs for multiple frameworks, billing, analytics, custom domains, or a general website builder.

## 2. System architecture

Use a modular monolith for the first release: one Next.js deployment, one PostgreSQL database, and independently testable domain modules. This avoids premature distributed-system overhead while preserving extraction seams.

```text
Browser builder / hosted preview / generated React UI
                         |
             Next.js server + route handlers
                         |
  application services (projects, config, export, tool actions)
       |            |              |             |
 authorization  config engine  auth execution  audit log
       |            |              |
       +-------- PostgreSQL --------+
                         |
       email / SMS / OAuth adapters (server only)

ChatGPT -> remote MCP/App SDK server -> same application services
```

Boundaries are strict: natural-language interpretation produces a candidate patch; the configuration engine validates it; application services authorize and persist it; renderers consume only validated configuration; auth execution applies additional fixed server policy. The LLM never receives provider secrets and never decides hashing, token entropy, rate limits, or authorization.

## 3. Recommended technology stack and reasons

- Next.js 16 App Router, React 19, and TypeScript strict mode: one typed web/server codebase, strong server-rendering support, route handlers, and a mature React ecosystem.
- Tailwind CSS 4 with a small token layer: rapid accessible builder UI without coupling domain objects to styling. Phase 1 deliberately keeps authored CSS readable while Tailwind is available.
- PostgreSQL: transactions, constraints, JSONB, indexing, and a clear multi-tenant path.
- Prisma ORM 7 stable for the MVP, not the Prisma 8 release candidate: typed queries and reviewable migrations. Re-evaluate Prisma 8 after stable release.
- Zod 4: one runtime boundary for route, tool, stored JSON, and import/export validation with inferred TypeScript types.
- Better Auth: a maintained authentication framework with Next.js integration and server-side session validation. Use its password/session/OAuth primitives rather than inventing them. A short Phase 7 spike is a gate before committing migrations.
- Vitest + Testing Library + Playwright: fast domain tests, accessible component tests, and critical user journeys.
- pnpm: deterministic, space-efficient installs. Node 24 LTS is the project baseline.

The OpenAI layer is a remote MCP server/App SDK integration over the same application services. Each tool declares its auth scheme and verifies issuer, audience, expiry, scopes, and project ownership server-side.

## 4. Database and data model

Keep the evolving AuthFlow document in JSONB while normalizing security- and ownership-critical records.

```text
users
  id uuid pk, email citext unique, name, email_verified_at, created_at, updated_at

projects
  id uuid pk, owner_id fk users, name, slug, account_type,
  active_config_id nullable, created_at, updated_at, archived_at
  unique(owner_id, slug)

auth_config_versions
  id uuid pk, project_id fk, version integer, schema_version integer,
  config jsonb, config_hash, created_by fk users, created_at
  unique(project_id, version)

provider_connections
  id uuid pk, project_id fk, provider enum, enabled,
  encrypted_credential_ref (reference only), settings jsonb, created_at, updated_at

verification_challenges
  id uuid pk, project_id fk, subject_id, channel, purpose,
  secret_hash, expires_at, attempt_count, max_attempts, consumed_at, created_at

recovery_tokens
  id uuid pk, subject_id, token_hash, expires_at, consumed_at, created_at

audit_events
  id uuid pk, owner_id, project_id nullable, actor_id, action,
  target_type, target_id, metadata jsonb (redacted), ip_hash nullable, created_at
```

Registration fields, branding, verification, labels, and recovery remain inside versioned `config` JSONB for atomic editing/export. Provider secrets do not live in that document. Row-level ownership is always enforced in application queries; optional PostgreSQL RLS is defense in depth, not the only control. Project deletion is soft in the MVP.

## 5. AuthFlow configuration schema

The stored document has `schemaVersion`, immutable IDs, and explicit defaults. A condensed shape:

```ts
type AuthFlowConfig = {
  schemaVersion: 1;
  app: { name: string; accountType: string };
  labels: {
    loginTitle: string; loginAction: string;
    signupTitle: string; signupAction: string;
    recoveryLink: string; existingAccount: string;
  };
  login: {
    identifiers: Array<"email" | "phone" | "username">;
    passwordEnabled: boolean;
    socialProviders: Array<{ provider: "google"; enabled: boolean }>;
  };
  registration: {
    fields: RegistrationField[];
    terms: ConsentConfig[];
  };
  verification: {
    email: { enabled: boolean; method: "link" | "otp" };
    phone: { enabled: boolean; method: "sms_otp" };
    otp: { ttlSeconds: number; resendCooldownSeconds: number; maxAttempts: number };
  };
  password: {
    minLength: number; requireUppercase: boolean; requireLowercase: boolean;
    requireNumber: boolean; requireSpecial: boolean; requireConfirmation: boolean;
  };
  recovery: {
    enabled: boolean; methods: Array<"email_link" | "email_otp" | "phone_otp">;
  };
  branding: {
    logoUrl?: string; primaryColor: string; backgroundColor: string;
    surfaceColor: string; borderRadius: number; fontFamily: "system" | "serif" | "mono";
  };
  redirects: { afterLogin?: string; afterSignup?: string; afterLogout?: string };
  messages: Record<string, string>;
};
```

`RegistrationField` is a discriminated union for `text`, `email`, `phone`, `password`, `number`, `date`, `select`, `radio`, `checkbox`, `textarea`, `boolean`, and `consent`. Validation is data only: required, min/max length, min/max number, a server-maintained pattern preset, and option lists. No JavaScript, regex supplied by tenants, HTML, or templates execute. Semantic validation rejects duplicate/reserved IDs, unsupported combinations, impossible verification requirements, unsafe redirect origins, and missing fields required by enabled identifiers.

## 6. API design

All endpoints are JSON over HTTPS, use validated sessions, derive `ownerId` from the server session, apply CSRF/origin checks to cookie-authenticated writes, and return `{ data, error, requestId }`.

```text
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:projectId
PATCH  /api/v1/projects/:projectId
DELETE /api/v1/projects/:projectId             (soft archive)
GET    /api/v1/projects/:projectId/config
PUT    /api/v1/projects/:projectId/config       (If-Match revision)
POST   /api/v1/projects/:projectId/config/validate
GET    /api/v1/projects/:projectId/config/export
GET    /api/v1/projects/:projectId/preview
GET    /api/v1/templates
POST   /api/v1/projects/:projectId/providers/google/connect
GET    /api/v1/oauth/google/callback
GET    /api/health
```

Use stable error codes such as `VALIDATION_FAILED`, `NOT_FOUND`, `FORBIDDEN`, `REVISION_CONFLICT`, and `RATE_LIMITED`; do not expose database/auth-provider internals. Authentication runtime endpoints arrive only after the execution model is threat-reviewed.

## 7. ChatGPT tool/action design

Expose resource-oriented MCP tools: `create_auth_project`, `get_auth_project`, `update_auth_project`, `configure_login`, `configure_registration`, `add_registration_field`, `remove_registration_field`, `configure_social_login`, `configure_verification`, `configure_recovery`, `configure_branding`, `preview_auth_flow`, and `export_auth_config`.

Every tool has a narrow Zod input, `oauth2` security metadata, required scopes (`projects:read` or `projects:write`), an idempotency key for creates, optimistic revision for writes, and a structured result containing `projectId`, `revision`, `config`, `warnings`, and a human summary. Tools call application services rather than HTTP-looping into public routes. Candidate natural-language changes are diffed, validated, and authorized before persistence. Tool descriptions never encourage collection of secrets; outputs redact provider settings.

## 8. Frontend architecture

Route groups separate owner auth, dashboard, and public hosted experiences. The builder uses three panes on wide screens and progressive drawers/tabs on small screens:

- left: sections and high-level controls;
- center: isolated live preview using the shared renderer;
- right: properties for the selected field/element.

State is a local draft with undo/redo and dirty tracking. Server state uses route/server actions with optimistic revision checks; preview updates are local and debounced. Drag-and-drop has keyboard controls and move-up/down alternatives. The renderer is pure and consumes only `ValidatedAuthFlowConfig`; the builder never maintains a second interpretation of the schema.

## 9. Security architecture

- Mature auth framework; Argon2id or framework-recommended password hashing parameters; no plaintext credentials.
- Opaque, rotated, server-validated sessions in `HttpOnly`, `Secure`, `SameSite=Lax/Strict` cookies; never authorize from cookie presence alone.
- Origin/CSRF protection for writes; allowlisted CORS only for future SDK origins.
- Zod at every trust boundary; parameterized ORM queries; React encoding plus sanitized, restricted rich content (none in MVP).
- Layered rate limits by account/IP/project/purpose with generic login/recovery responses and security audit events.
- OTP/reset values generated by cryptographically secure libraries, stored as hashes, short lived, single use, attempt limited, and transactionally consumed.
- OAuth Authorization Code + PKCE, signed state/nonce, exact redirect allowlists, server-only secrets, and provider adapters.
- Secrets in deployment secret management; logs redact tokens, codes, passwords, cookies, provider responses, and sensitive field values.
- Authorization is checked in every project application service. Tests must prove cross-owner access fails even with known IDs.
- CSP, HSTS, anti-framing, MIME protection, dependency scanning, protected branches, reviewed migrations, backups, and incident-ready audit logs.

Security-sensitive ambiguities resolved for the MVP: custom regex is disallowed; redirects are same-origin or explicit allowlist; phone/email verification cannot be enabled unless the corresponding field exists and is required; owner auth and generated end-user auth use separate concepts/tables; provider credentials are referenced outside exported config; public error messages are generic while internal audit data is detailed and redacted.

## 10. Folder structure

```text
.github/workflows/ci.yml
docs/
  MVP-PLAN.md
prisma/                         # Phase 2
src/
  app/
    (dashboard)/                # Phase 2+
    api/v1/                     # route adapters
    api/health/
  components/ui/                # accessible primitives
  modules/
    projects/
    auth-config/
    builder/
    renderer/
    auth-execution/
    verification/
    recovery/
    providers/
    export/
    tool-api/
  lib/
    db/ security/ observability/ validation/
  test/
```

Domain modules expose a small `index.ts` public surface. UI never imports database clients; routes never contain business rules; adapters implement domain-owned interfaces.

## 11. Development phases

1. Foundation: plan, app shell, toolchain, security headers, CI, health endpoint.
2. Database/project management: Prisma 7, PostgreSQL, owner auth, project CRUD, ownership/audit tests.
3. AuthFlow schema: full Zod schema, defaults, semantic refinement, migrations, fixtures, tests.
4. Dynamic renderer: accessible field registry, validation mapping, responsive forms.
5. Builder: terminology, account type, registration fields, login/recovery controls.
6. Live preview: shared renderer, device modes, draft state and autosave conflict handling.
7. Authentication backend: Better Auth spike, owner auth, generated end-user email/password flows.
8. Verification/recovery: hashed challenges, TTL, limits, adapter contracts, recovery transactions. **Complete.**
9. Social auth: real Google adapter, PKCE/state/callback tests; no mock success path. **Complete.**
10. Branding: safe tokens, logo policy, contrast feedback, theme preview. **Complete.**
11. Export: validated/versioned JSON and one React/Next.js component target. **Complete.**
12. ChatGPT tools: structured tool registry and adapters using the same services and OAuth scopes. **Complete.**
13. Security review: threat model, abuse cases, dependency and configuration review. **Complete.**
14. Automated testing: complete integration/E2E/authorization matrix and CI gates.
15. Deployment docs: containers, migrations, secrets, backups, monitoring, runbooks.

Each phase starts with its contract/test plan, lists touched files in its delivery note, and ends with lint, typecheck, unit/integration tests, and production build. A phase does not hide or waive failures.

## 12. External services and credentials needed

No credentials are required for Phase 1. Later phases require PostgreSQL; a transactional email provider/domain and API key; an SMS provider account, sender, and API credentials; a Google OAuth app with client ID/secret and exact callback URLs; deployment secret storage; a durable rate-limit store such as Redis; error monitoring; and an OpenAI/ChatGPT app registration plus OAuth authorization-server metadata for remote MCP tools. Local development uses non-production test credentials and provider sandboxes. Secrets never use `NEXT_PUBLIC_`.

## 13. Local development setup

Prerequisites: Node 24.11+, pnpm 11.19+, Git, and later Docker Desktop for PostgreSQL/Redis. Copy `.env.example` to `.env.local`, install with `pnpm install`, run `pnpm dev`, and visit `http://localhost:3000`. Check `http://localhost:3000/api/health`. Run `pnpm check` before committing. Phase 2 will add `docker compose up -d` and migration/seed commands.

On this machine, use the bundled pnpm because the global npm shim is incomplete. VS Code is configured to use the workspace TypeScript version and distinguish App Router filenames.

## 14. Testing strategy

- Unit: schema fields/refinements/defaults, config migration, password policy mapping, token/challenge state machines, adapter contracts, authorization predicates.
- Property/fixture: valid templates round-trip; malformed/duplicate/reserved fields fail; exported JSON parses back to the same normalized config.
- Component/accessibility: labels, descriptions, errors, focus, keyboard reorder, password visibility, responsive builder/renderer, automated axe checks.
- Integration: PostgreSQL repositories, transactions, revision conflicts, audit emission, expired/used challenges, adapter failure mapping.
- API/tool contract: authentication, scope and ownership, Zod errors, idempotency, optimistic concurrency, secret redaction, stable error codes.
- Authentication security: cross-tenant IDOR, brute-force/rate limit, generic recovery responses, OTP attempts/expiry, reset single use, OAuth state/nonce/PKCE and invalid callbacks.
- E2E: create project → configure → preview → save → export; generated email/password and recovery flows once real adapters exist.

CI gates are lint, strict typecheck, unit/integration tests, production build, migration checks, and later Playwright plus dependency/secret scanning. Security tests use fake in-process adapters, not fake production authentication.

## Decision references

- Next.js App Router installation and editor guidance: https://nextjs.org/docs/app/getting-started/installation
- Prisma PostgreSQL quickstart/status: https://www.prisma.io/docs/prisma-orm/quickstart/postgresql
- Better Auth Next.js integration and server validation warning: https://better-auth.com/docs/integrations/next
- OpenAI Apps/Plugins authentication: https://developers.openai.com/plugins/build/auth
