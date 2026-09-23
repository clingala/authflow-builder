# Project-owned delivery integrations

AuthFlow Builder never uses a shared personal sender identity for customer
projects. Delivery is a project-owned server-side connection: its credentials
are encrypted at rest, excluded from JSON exports and public APIs, and never
sent to the browser.

## Initial provider: Resend

The first adapter sends email verification and recovery links or OTPs through
Resend. Each project owner must supply a verified Resend sender address from a
domain they control. Resend cannot send SMS, so phone OTP stays unavailable
until an SMS adapter is configured.

## Security contract

- Provider credentials are entered once over an authenticated owner endpoint.
- Only encrypted ciphertext is persisted; read APIs return provider status and
  sender address, never the API key.
- Every mutation performs server-side project ownership checks and input
  validation.
- Exported AuthFlow configuration contains no credentials.
- A failed or unconfigured adapter returns delivery unavailable; it never
  simulates a successful email or SMS.

## Current integration

Run the `20260923190117_add_delivery_connections` migration before using the
builder. Project owners can connect or rotate a Resend API key in the builder's
Integrations section. The owner-only `/api/v1/projects/{projectId}/delivery`
endpoint accepts GET, PUT, and DELETE; GET returns metadata only. Connection
changes produce audit events. At challenge-send time, a project connection
takes precedence over the installation-wide delivery webhook, if configured.
Without either provider, delivery returns unavailable. A Resend connection
supports email only; phone OTP still requires an SMS-capable provider.

This integration does not verify a sender domain during connection setup.
Owners must verify their domain with Resend before sending. No production
credentials or sending domain are included in the repository. Rotating
`AUTH_SECRET` invalidates encrypted project credentials until they are
reconnected; plan a re-encryption migration before key rotation.

Before production enablement, exercise real email delivery and recovery with
a verified domain, plus OTP expiry, rate limits, and tenant isolation in a
staging environment. Provider delivery failures create redacted runtime audit
events and invalidate the unsent challenge so users can retry. Operational
alerting for elevated provider failures is still required before public launch.
