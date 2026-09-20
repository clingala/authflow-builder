# Phase 4 delivery — Dynamic authentication renderer

Phase 4 adds the shared React renderer that converts a validated AuthFlow configuration into accessible login, signup, verification, and recovery experiences. The renderer is presentation and interaction infrastructure only: it delegates real submissions and provider actions to injected handlers and does not simulate authentication success.

## Delivered

- One typed `AuthFlowRenderer` for login, signup, verification, and recovery screens.
- A complete field registry for text, email, phone, password, number, date, dropdown, radio, checkbox, textarea, boolean, and consent fields.
- Native browser constraint mapping from server-approved validation presets. Tenant-supplied regular expressions or executable validation remain unsupported.
- Configuration-driven application name, account type, terminology, registration order, social providers, password rules, OTP timing information, branding, spacing, typography, and field arrangement.
- Accessible labels, fieldsets, descriptions, error associations, invalid states, status announcements, focus indicators, password controls, and semantic form elements.
- Responsive one- and two-column layouts plus a mobile-safe preview surface.
- Password visibility, strength feedback, and explicit configured-requirement feedback.
- A preview route at `/preview` with screen switching and clear non-execution messaging.

## Architecture

```text
Validated AuthFlowConfig
        |
AuthFlowRenderer
        +-- screen composition
        +-- field registry
        +-- safe native constraints
        +-- theme tokens
        +-- callback boundary -> future auth execution services
```

The renderer accepts only the inferred `AuthFlowConfig` type. API and persistence boundaries are responsible for calling the Phase 3 parser first. Submission, navigation, and OAuth-provider selection are callback interfaces so Phase 7 and Phase 9 can connect real services without replacing UI components.

## Main files

```text
src/modules/renderer/auth-flow-renderer.tsx
src/modules/renderer/field-renderer.tsx
src/modules/renderer/validation.ts
src/components/preview/auth-flow-demo.tsx
src/app/preview/page.tsx
```

## Testing

Renderer tests cover configuration terminology, dynamic fields, multi-identifier login, password visibility and strength, accessible error relationships, action delegation, OTP policy content, safe constraint mapping, and password-policy evaluation.

## Deferred

Phase 5 will add builder controls for editing the same configuration. Phase 6 will connect draft state, device modes, and project-specific live preview. Real password, OTP, recovery, and OAuth execution remain deferred to their dedicated security-reviewed phases.
