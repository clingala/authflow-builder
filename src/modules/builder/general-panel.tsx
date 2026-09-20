"use client";

import type { AuthFlowConfig } from "@/modules/auth-config";

import { ControlGroup, TextControl } from "./controls";
import type { UpdateAuthConfig } from "./types";

export function GeneralPanel({ config, update }: { config: AuthFlowConfig; update: UpdateAuthConfig }) {
  const labelControls: Array<{ key: keyof AuthFlowConfig["labels"]; label: string }> = [
    { key: "loginTitle", label: "Login page title" },
    { key: "loginAction", label: "Login button" },
    { key: "signupTitle", label: "Signup page title" },
    { key: "signupAction", label: "Signup button" },
    { key: "recoveryLink", label: "Recovery link" },
    { key: "recoveryTitle", label: "Recovery page title" },
    { key: "existingAccount", label: "Existing-account text" },
    { key: "newAccount", label: "New-account text" },
  ];

  function changeAccountType(value: string) {
    update((draft) => {
      const previous = draft.app.accountType;
      if (draft.labels.loginTitle === `${previous} Login`) draft.labels.loginTitle = `${value} Login`;
      if (draft.labels.signupTitle === `Create ${previous} Account`) draft.labels.signupTitle = `Create ${value} Account`;
      if (draft.registration.description === `Create your ${previous.toLowerCase()} account.`) {
        draft.registration.description = `Create your ${value.toLowerCase()} account.`;
      }
      draft.app.accountType = value;
    });
  }

  return (
    <div className="builder-section-panel">
      <ControlGroup title="Application" description="Use terminology that matches the product and its account holders.">
        <TextControl label="Application name" value={config.app.name} maxLength={100} onChange={(value) => update((draft) => { draft.app.name = value; })} />
        <TextControl label="Account type" value={config.app.accountType} maxLength={50} onChange={changeAccountType} />
      </ControlGroup>
      <ControlGroup title="Terminology">
        {labelControls.map((control) => (
          <TextControl
            key={control.key}
            label={control.label}
            value={config.labels[control.key]}
            onChange={(value) => update((draft) => { draft.labels[control.key] = value; })}
          />
        ))}
      </ControlGroup>
    </div>
  );
}
