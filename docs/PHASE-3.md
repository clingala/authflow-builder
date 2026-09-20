# Phase 3 delivery — AuthFlow configuration engine

Phase 3 replaces the temporary project configuration with the first complete, versioned AuthFlow contract. The builder, renderer, API, exports, and future ChatGPT tools can now share one validated source of truth.

## Delivered

- A strict Zod schema for application metadata, configurable terminology, login identifiers, social-provider flags, registration, verification, password policy, recovery, branding, redirects, and safe messages.
- A discriminated registration-field union covering text, email, phone, password, textarea, number, date, dropdown, radio, checkbox, boolean, and consent fields.
- Data-only validation rules. Tenant-supplied executable code and arbitrary regular expressions are not accepted.
- Semantic validation for duplicate/reserved field IDs, missing identifier fields, password confirmation, verification prerequisites, recovery-channel prerequisites, social-signup consistency, duplicate options, and unsafe redirects.
- Secure defaults and explicit schema-version migration boundaries.
- Ten editable starting templates, including customer, applicant, student, employee, healthcare, seller, delivery, SaaS, e-commerce, and custom configurations.
- Public read-only template endpoints at `GET /api/v1/templates` and `GET /api/v1/templates/:templateId?appName=...`.
- Server-side validation and normalization before every saved configuration version.
- Atomic synchronization of project name and account type from the accepted configuration.

## Security decisions

- Stored input is rejected unless it conforms to the complete server schema; frontend validation is never trusted alone.
- Redirects are relative same-origin paths in the MVP.
- Enabled email/phone verification requires a corresponding required registration field.
- Provider credentials are intentionally absent from the portable configuration.
- Configuration size remains capped at 64 KiB before persistence.
- Unknown schema versions fail closed through a dedicated migration error.

## Main files

```text
src/modules/auth-config/schema.ts
src/modules/auth-config/defaults.ts
src/modules/auth-config/migrate.ts
src/modules/auth-config/templates.ts
src/app/api/v1/templates/route.ts
src/app/api/v1/templates/[templateId]/route.ts
src/modules/projects/service.ts
src/modules/projects/prisma-project-store.ts
```

Schema, migration, template, project authorization, metadata synchronization, and API-boundary behavior are covered by the automated suite. The PostgreSQL smoke test also exercises the full default configuration through real versioned persistence and tenant isolation.

## Deferred to Phase 4+

Phase 4 will build the accessible, responsive renderer that consumes this contract. Builder editing controls, draft state, and device previews remain in Phases 5 and 6. This phase does not add authentication execution, OAuth callbacks, OTP delivery, or fake success paths.
