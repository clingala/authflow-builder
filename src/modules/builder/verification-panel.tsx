"use client";

import type { AuthFlowConfig } from "@/modules/auth-config";

import { ControlGroup, NumberControl, SelectControl, ToggleControl } from "./controls";
import type { UpdateAuthConfig } from "./types";

export function VerificationPanel({ config, update }: { config: AuthFlowConfig; update: UpdateAuthConfig }) {
  return (
    <div className="builder-section-panel">
      <ControlGroup title="Email verification" description="Requires a required email registration field.">
        <ToggleControl label="Verify email" checked={config.verification.email.enabled} onChange={(checked) => update((draft) => { draft.verification.email.enabled = checked; })} />
        <SelectControl label="Method" value={config.verification.email.method} onChange={(event) => update((draft) => { draft.verification.email.method = event.currentTarget.value as "link" | "otp"; })}>
          <option value="link">Verification link</option>
          <option value="otp">Email OTP</option>
        </SelectControl>
      </ControlGroup>
      <ControlGroup title="Phone verification" description="SMS delivery remains an adapter boundary until a provider is connected.">
        <ToggleControl label="Verify phone with SMS OTP" checked={config.verification.phone.enabled} onChange={(checked) => update((draft) => { draft.verification.phone.enabled = checked; })} />
      </ControlGroup>
      <ControlGroup title="OTP protection">
        <NumberControl label="Expires after (seconds)" value={config.verification.otp.ttlSeconds} min={60} max={1800} onChange={(value) => update((draft) => { draft.verification.otp.ttlSeconds = value; })} />
        <NumberControl label="Resend cooldown (seconds)" value={config.verification.otp.resendCooldownSeconds} min={15} max={600} onChange={(value) => update((draft) => { draft.verification.otp.resendCooldownSeconds = value; })} />
        <NumberControl label="Maximum attempts" value={config.verification.otp.maxAttempts} min={3} max={10} onChange={(value) => update((draft) => { draft.verification.otp.maxAttempts = value; })} />
        <NumberControl label="Maximum resends" value={config.verification.otp.maxResends} min={1} max={10} onChange={(value) => update((draft) => { draft.verification.otp.maxResends = value; })} />
      </ControlGroup>
    </div>
  );
}
