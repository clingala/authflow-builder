"use client";

import type { AuthFlowConfig } from "@/modules/auth-config";

import { ControlGroup, NumberControl, ToggleControl } from "./controls";
import type { UpdateAuthConfig } from "./types";

type Identifier = AuthFlowConfig["login"]["identifiers"][number];
type Provider = keyof AuthFlowConfig["login"]["socialProviders"];

export function LoginPanel({ config, update }: { config: AuthFlowConfig; update: UpdateAuthConfig }) {
  const identifiers: Array<{ id: Identifier; label: string }> = [
    { id: "email", label: "Email" },
    { id: "phone", label: "Phone number" },
    { id: "username", label: "Username" },
  ];
  const providers: Array<{ id: Provider; label: string }> = [
    { id: "google", label: "Google" },
    { id: "linkedin", label: "LinkedIn" },
    { id: "facebook", label: "Facebook" },
  ];

  function toggleIdentifier(identifier: Identifier, checked: boolean) {
    update((draft) => {
      if (checked) {
        if (!draft.login.identifiers.includes(identifier)) draft.login.identifiers.push(identifier);
      } else if (draft.login.identifiers.length > 1) {
        draft.login.identifiers = draft.login.identifiers.filter((candidate) => candidate !== identifier);
      }
    });
  }

  function toggleProvider(provider: Provider, checked: boolean) {
    update((draft) => {
      draft.login.socialProviders[provider] = checked;
      if (!Object.values(draft.login.socialProviders).some(Boolean)) draft.registration.socialSignup = false;
    });
  }

  function updatePasswordLength(key: "minLength" | "maxLength", value: number) {
    update((draft) => {
      draft.passwordPolicy[key] = value;
      draft.registration.fields.forEach((field) => {
        if (field.type === "password") field.validation = { ...field.validation, [key]: value };
      });
    });
  }

  return (
    <div className="builder-section-panel">
      <ControlGroup title="Login identifiers" description="At least one identifier must remain enabled and have a matching required registration field.">
        {identifiers.map((identifier) => (
          <ToggleControl
            key={identifier.id}
            label={identifier.label}
            checked={config.login.identifiers.includes(identifier.id)}
            onChange={(checked) => toggleIdentifier(identifier.id, checked)}
          />
        ))}
      </ControlGroup>
      <ControlGroup title="Credentials">
        <ToggleControl
          label="Password login"
          description="Requires password and confirmation fields."
          checked={config.login.passwordEnabled}
          onChange={(checked) => update((draft) => { draft.login.passwordEnabled = checked; })}
        />
        <NumberControl label="Minimum password length" value={config.passwordPolicy.minLength} min={12} max={128} onChange={(value) => updatePasswordLength("minLength", value)} />
        <NumberControl label="Maximum password length" value={config.passwordPolicy.maxLength} min={12} max={256} onChange={(value) => updatePasswordLength("maxLength", value)} />
        <ToggleControl label="Require uppercase" checked={config.passwordPolicy.requireUppercase} onChange={(checked) => update((draft) => { draft.passwordPolicy.requireUppercase = checked; })} />
        <ToggleControl label="Require lowercase" checked={config.passwordPolicy.requireLowercase} onChange={(checked) => update((draft) => { draft.passwordPolicy.requireLowercase = checked; })} />
        <ToggleControl label="Require number" checked={config.passwordPolicy.requireNumber} onChange={(checked) => update((draft) => { draft.passwordPolicy.requireNumber = checked; })} />
        <ToggleControl label="Require special character" checked={config.passwordPolicy.requireSpecial} onChange={(checked) => update((draft) => { draft.passwordPolicy.requireSpecial = checked; })} />
        <ToggleControl label="Require confirmation" checked={config.passwordPolicy.requireConfirmation} onChange={(checked) => update((draft) => { draft.passwordPolicy.requireConfirmation = checked; })} />
        <ToggleControl label="Show password strength" checked={config.passwordPolicy.showStrength} onChange={(checked) => update((draft) => { draft.passwordPolicy.showStrength = checked; })} />
      </ControlGroup>
      <ControlGroup title="Social login" description="Provider buttons only render UI until real server-side credentials are connected.">
        {providers.map((provider) => (
          <ToggleControl
            key={provider.id}
            label={provider.label}
            checked={config.login.socialProviders[provider.id]}
            onChange={(checked) => toggleProvider(provider.id, checked)}
          />
        ))}
        <ToggleControl
          label="Allow social signup"
          checked={config.registration.socialSignup}
          disabled={!Object.values(config.login.socialProviders).some(Boolean)}
          onChange={(checked) => update((draft) => { draft.registration.socialSignup = checked; })}
        />
      </ControlGroup>
    </div>
  );
}
