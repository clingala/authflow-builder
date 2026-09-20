"use client";

import type { AuthFlowConfig } from "@/modules/auth-config";

import { ControlGroup, ToggleControl } from "./controls";
import type { UpdateAuthConfig } from "./types";

type RecoveryMethod = AuthFlowConfig["recovery"]["methods"][number];

export function RecoveryPanel({ config, update }: { config: AuthFlowConfig; update: UpdateAuthConfig }) {
  const methods: Array<{ id: RecoveryMethod; label: string; description: string }> = [
    { id: "email_link", label: "Email reset link", description: "Send a single-use reset link." },
    { id: "email_otp", label: "Email OTP", description: "Verify identity with an emailed code." },
    { id: "phone_otp", label: "Phone OTP", description: "Verify identity with an SMS code." },
  ];

  function toggleMethod(method: RecoveryMethod, checked: boolean) {
    update((draft) => {
      if (checked && !draft.recovery.methods.includes(method)) draft.recovery.methods.push(method);
      if (!checked) draft.recovery.methods = draft.recovery.methods.filter((candidate) => candidate !== method);
    });
  }

  return (
    <div className="builder-section-panel">
      <ControlGroup title="Account recovery">
        <ToggleControl label="Enable account recovery" checked={config.recovery.enabled} onChange={(checked) => update((draft) => { draft.recovery.enabled = checked; })} />
      </ControlGroup>
      <ControlGroup title="Recovery methods" description="Email methods require a required email field; phone OTP requires a required phone field.">
        {methods.map((method) => (
          <ToggleControl
            key={method.id}
            label={method.label}
            description={method.description}
            checked={config.recovery.methods.includes(method.id)}
            disabled={!config.recovery.enabled}
            onChange={(checked) => toggleMethod(method.id, checked)}
          />
        ))}
      </ControlGroup>
    </div>
  );
}
