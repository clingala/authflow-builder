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

## Rollout sequence

1. Add persistence and owner-only API routes for an encrypted project
   connection.
2. Add the Delivery Integrations builder panel with a Resend form that never
   re-displays the entered API key.
3. Resolve the adapter per project at challenge-send time.
4. Add audit events for connection changes and delivery-provider failures.
5. Test verified sending domains, recovery, OTP expiry, rate limits, and tenant
   isolation in staging before enabling a project.

