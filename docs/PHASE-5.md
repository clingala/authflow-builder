# Phase 5 delivery — Visual authentication builder

Phase 5 adds the authenticated, project-specific visual builder. Owners edit the same validated `AuthFlowConfig` document used by persistence and the Phase 4 renderer; the builder does not maintain a second form model or simulate authentication execution.

## Delivered

- An owner-authorized builder route at `/dashboard/projects/:projectId/builder` with server-side project ownership enforcement.
- A responsive three-pane workspace: configuration sections, shared live renderer, and selected-field properties.
- Configuration controls for application/account terminology, login identifiers, password policy, social-provider presentation, registration content, email/phone verification, recovery methods, and safe branding tokens.
- Dynamic registration fields with standard/custom types, add/remove, required state, validation limits, choice options, and accessible move-up/move-down ordering.
- Immediate desktop/mobile previews for login, signup, verification, and recovery using the production renderer rather than duplicated markup.
- Local draft and dirty-state tracking, explicit discard, browser-leave protection, client-side schema validation, server-side validation, and structured issue summaries.
- Optimistic version saves through the owner-scoped config API, including revision-conflict handling and a visible saved version.
- Dashboard links from each project into its builder.
- Development-origin configuration for local `127.0.0.1` use and a proxy-aware same-origin write check that still rejects missing or cross-site origins.

## Architecture

```text
Owner session + project ownership
              |
 project builder server route
              |
     useAuthBuilder draft state
       |                  |
 typed control panels   AuthFlowRenderer
       |                  |
       +---- validated AuthFlowConfig ----+
                         |
              versioned config PUT
```

All editing functions operate on a cloned typed draft. The schema validates the complete document before a network write; the API validates again and checks the expected configuration version in the same owner-scoped application-service path used by other clients. Provider toggles configure presentation only—no fake OAuth, OTP, recovery, or credential success path was added.

## Main files

```text
src/app/dashboard/projects/[projectId]/builder/page.tsx
src/modules/builder/auth-flow-builder.tsx
src/modules/builder/use-auth-builder.ts
src/modules/builder/*-panel.tsx
src/modules/builder/field-properties.tsx
src/modules/builder/controls.tsx
src/modules/builder/auth-flow-builder.test.tsx
```

## Testing

Component tests cover the initial builder shell, live metadata updates, registration-field add/edit/reorder/remove, local validation blocking, successful versioned saves, and revision conflicts. API regression coverage includes proxy-aware same-origin enforcement. The browser QA journey covered owner signup and sign-in, project creation, live field editing, mobile/desktop preview, and a persisted version increment.

## Deferred

Phase 6 will deepen draft recovery and conflict-resolution UX and expand preview workflow coverage. Real generated-user authentication, verification, recovery, and Google OAuth execution remain deferred to their security-reviewed phases; Phase 5 only configures and previews those contracts.
