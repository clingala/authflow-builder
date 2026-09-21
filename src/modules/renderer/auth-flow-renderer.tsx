"use client";

import type { CSSProperties, FormEvent, ReactNode } from "react";

import type { AuthFlowConfig, RegistrationField } from "@/modules/auth-config";
import { accessibleFocusColor, accessibleTextColor } from "@/modules/branding";

import { FieldRenderer } from "./field-renderer";

export type AuthFlowScreen = "login" | "signup" | "verification" | "recovery" | "recoveryReset";
type SocialProvider = keyof AuthFlowConfig["login"]["socialProviders"];

export type AuthFlowRendererProps = {
  config: AuthFlowConfig;
  screen: AuthFlowScreen;
  errors?: Record<string, string>;
  submitting?: boolean;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  onNavigate?: (screen: AuthFlowScreen) => void;
  onSocialLogin?: (provider: SocialProvider) => void;
};

type ThemeStyle = CSSProperties & {
  "--authflow-primary": string;
  "--authflow-background": string;
  "--authflow-surface": string;
  "--authflow-text": string;
  "--authflow-radius": string;
  "--authflow-primary-contrast": string;
  "--authflow-focus": string;
};

const providerNames: Record<SocialProvider, string> = {
  google: "Google",
  linkedin: "LinkedIn",
  facebook: "Facebook",
};

function fontStack(font: AuthFlowConfig["branding"]["fontFamily"]) {
  if (font === "serif") return "Georgia, 'Times New Roman', serif";
  if (font === "mono") return "Consolas, 'Courier New', monospace";
  return "Arial, Helvetica, sans-serif";
}

function loginIdentifierField(config: AuthFlowConfig): RegistrationField {
  const identifiers = config.login.identifiers;
  if (identifiers.length === 1) {
    const identifier = identifiers[0]!;
    const labels = { email: "Email Address", phone: "Phone Number", username: "Username" };
    const types = { email: "email", phone: "phone", username: "text" } as const;
    const autocomplete = { email: "email", phone: "tel", username: "username" } as const;
    return {
      id: "login_identifier",
      label: labels[identifier],
      type: types[identifier],
      required: true,
      width: "full",
      autocomplete: autocomplete[identifier],
    };
  }

  const labels = identifiers.map((identifier) => identifier === "email" ? "Email" : identifier === "phone" ? "Phone" : "Username");
  return {
    id: "login_identifier",
    label: labels.length === 2 ? labels.join(" or ") : `${labels.slice(0, -1).join(", ")}, or ${labels.at(-1)}`,
    type: "text",
    required: true,
    width: "full",
    autocomplete: "username",
  };
}

function LoginScreen({ config, errors, onNavigate, onSocialLogin }: Pick<AuthFlowRendererProps, "config" | "errors" | "onNavigate" | "onSocialLogin">) {
  const fields: RegistrationField[] = [loginIdentifierField(config)];
  if (config.login.passwordEnabled) {
    fields.push({
      id: "login_password",
      label: "Password",
      type: "password",
      required: true,
      width: "full",
      autocomplete: "current-password",
      validation: { minLength: config.passwordPolicy.minLength, maxLength: config.passwordPolicy.maxLength },
    });
  }

  return (
    <>
      <ScreenHeading title={config.labels.loginTitle} description={`Access your ${config.app.accountType.toLowerCase()} account.`} />
      <SocialProviders config={config} context="login" onSocialLogin={onSocialLogin} />
      <div className="authflow-form-grid">
        {fields.map((field) => <FieldRenderer key={field.id} field={field} passwordPolicy={config.passwordPolicy} error={errors?.[field.id]} />)}
      </div>
      {config.recovery.enabled ? <NavigationButton onClick={() => onNavigate?.("recovery")}>{config.labels.recoveryLink}</NavigationButton> : null}
      <SubmitButton config={config}>{config.labels.loginAction}</SubmitButton>
      <ScreenSwitch text={config.labels.newAccount} target="signup" onNavigate={onNavigate} />
    </>
  );
}

function SignupScreen({ config, errors, onNavigate, onSocialLogin }: Pick<AuthFlowRendererProps, "config" | "errors" | "onNavigate" | "onSocialLogin">) {
  return (
    <>
      <ScreenHeading title={config.labels.signupTitle} description={config.registration.description} />
      {config.registration.socialSignup ? <SocialProviders config={config} context="signup" onSocialLogin={onSocialLogin} /> : null}
      <div className={`authflow-form-grid authflow-arrangement-${config.branding.fieldArrangement}`}>
        {config.registration.fields.map((field) => <FieldRenderer key={field.id} field={field} passwordPolicy={config.passwordPolicy} error={errors?.[field.id]} />)}
      </div>
      <SubmitButton config={config}>{config.labels.signupAction}</SubmitButton>
      <ScreenSwitch text={config.labels.existingAccount} target="login" onNavigate={onNavigate} />
    </>
  );
}

function RecoveryScreen({ config, errors, onNavigate }: Pick<AuthFlowRendererProps, "config" | "errors" | "onNavigate">) {
  const usePhone = config.recovery.methods.length === 1 && config.recovery.methods[0] === "phone_otp";
  const field: RegistrationField = usePhone
    ? { id: "recovery_identifier", label: "Phone Number", type: "phone", required: true, width: "full", autocomplete: "tel" }
    : { id: "recovery_identifier", label: "Email Address", type: "email", required: true, width: "full", autocomplete: "email" };

  return (
    <>
      <ScreenHeading title={config.labels.recoveryTitle} description="Enter your account details. If a matching account exists, recovery instructions will be sent." />
      <div className="authflow-form-grid"><FieldRenderer field={field} passwordPolicy={config.passwordPolicy} error={errors?.recovery_identifier} /></div>
      <SubmitButton config={config}>Send Recovery Instructions</SubmitButton>
      <ScreenSwitch text={`Return to ${config.labels.loginAction}`} target="login" onNavigate={onNavigate} />
    </>
  );
}

function VerificationScreen({ config, errors, onNavigate }: Pick<AuthFlowRendererProps, "config" | "errors" | "onNavigate">) {
  const channels = [config.verification.email.enabled ? "email" : null, config.verification.phone.enabled ? "phone" : null].filter(Boolean);
  const needsOtp = config.verification.phone.enabled || (config.verification.email.enabled && config.verification.email.method === "otp");
  const codeField: RegistrationField = {
    id: "verification_code",
    label: "Verification Code",
    type: "text",
    required: true,
    width: "full",
    autocomplete: "off",
    inputMode: "numeric",
    placeholder: "Enter your code",
    validation: { minLength: 4, maxLength: 10 },
  };

  return (
    <>
      <ScreenHeading
        title="Verify Your Account"
        description={channels.length ? `Complete ${channels.join(" and ")} verification to continue.` : "No verification is required for this account."}
      />
      {needsOtp ? (
        <>
          <div className="authflow-form-grid"><FieldRenderer field={codeField} passwordPolicy={config.passwordPolicy} error={errors?.verification_code} /></div>
          <p className="authflow-cooldown">Codes expire after {Math.round(config.verification.otp.ttlSeconds / 60)} minutes. Resend is available after {config.verification.otp.resendCooldownSeconds} seconds.</p>
          <SubmitButton config={config}>Verify Account</SubmitButton>
        </>
      ) : <div className="authflow-notice" role="status">Check your email and follow the secure verification link.</div>}
      <ScreenSwitch text={`Return to ${config.labels.loginAction}`} target="login" onNavigate={onNavigate} />
    </>
  );
}

function RecoveryResetScreen({ config, errors, onNavigate }: Pick<AuthFlowRendererProps, "config" | "errors" | "onNavigate">) {
  const fields: RegistrationField[] = [
    { id: "recovery_secret", label: "Recovery Code", type: "text", required: true, width: "full", autocomplete: "off" },
    { id: "recovery_password", label: "New Password", type: "password", required: true, width: "full", autocomplete: "new-password", validation: { minLength: config.passwordPolicy.minLength, maxLength: config.passwordPolicy.maxLength } },
    { id: "recovery_confirm_password", label: "Confirm New Password", type: "password", required: true, width: "full", autocomplete: "new-password" },
  ];
  return <>
    <ScreenHeading title={config.labels.recoveryTitle} description="Enter the code or token you received and choose a new password." />
    <div className="authflow-form-grid">{fields.map((field) => <FieldRenderer key={field.id} field={field} passwordPolicy={config.passwordPolicy} error={errors?.[field.id]} />)}</div>
    <SubmitButton config={config}>Reset Password</SubmitButton>
    <ScreenSwitch text={`Return to ${config.labels.loginAction}`} target="login" onNavigate={onNavigate} />
  </>;
}

export function AuthFlowRenderer({ config, screen, errors, submitting = false, onSubmit, onNavigate, onSocialLogin }: AuthFlowRendererProps) {
  const theme: ThemeStyle = {
    "--authflow-primary": config.branding.primaryColor,
    "--authflow-background": config.branding.backgroundColor,
    "--authflow-surface": config.branding.surfaceColor,
    "--authflow-text": config.branding.textColor,
    "--authflow-radius": `${config.branding.borderRadius}px`,
    "--authflow-primary-contrast": accessibleTextColor(config.branding.primaryColor),
    "--authflow-focus": accessibleFocusColor(config.branding.primaryColor, config.branding.surfaceColor),
    fontFamily: fontStack(config.branding.fontFamily),
  };

  function submit(event: FormEvent<HTMLFormElement>) {
    if (!onSubmit) event.preventDefault();
    onSubmit?.(event);
  }

  return (
    <section className={`authflow-renderer authflow-spacing-${config.branding.spacing}`} style={theme} aria-label={`${config.app.name} authentication preview`}>
      <div className="authflow-card">
        <header className="authflow-app-brand">
          {config.branding.logoUrl ? (
            // Tenant logo URLs are restricted by the server schema to relative or HTTPS URLs.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.branding.logoUrl} alt={`${config.app.name} logo`} width="34" height="34" referrerPolicy="no-referrer" />
          ) : <span aria-hidden="true">{config.app.name.slice(0, 1).toUpperCase()}</span>}
          <strong>{config.app.name}</strong>
        </header>
        <form onSubmit={submit} noValidate={false} aria-busy={submitting}>
          {screen === "login" ? <LoginScreen config={config} errors={errors} onNavigate={onNavigate} onSocialLogin={onSocialLogin} /> : null}
          {screen === "signup" ? <SignupScreen config={config} errors={errors} onNavigate={onNavigate} onSocialLogin={onSocialLogin} /> : null}
          {screen === "recovery" ? <RecoveryScreen config={config} errors={errors} onNavigate={onNavigate} /> : null}
          {screen === "verification" ? <VerificationScreen config={config} errors={errors} onNavigate={onNavigate} /> : null}
          {screen === "recoveryReset" ? <RecoveryResetScreen config={config} errors={errors} onNavigate={onNavigate} /> : null}
          {submitting ? <span className="authflow-sr-only" role="status">Submitting</span> : null}
        </form>
      </div>
    </section>
  );
}

function SocialProviders({ config, context, onSocialLogin }: { config: AuthFlowConfig; context: "login" | "signup"; onSocialLogin?: (provider: SocialProvider) => void }) {
  const providers = (Object.entries(config.login.socialProviders) as Array<[SocialProvider, boolean]>).filter(([, enabled]) => enabled);
  if (!providers.length) return null;
  return (
    <div className="authflow-social">
      {providers.map(([provider]) => (
        <button type="button" key={provider} onClick={() => onSocialLogin?.(provider)} aria-disabled={!onSocialLogin}>
          Continue {context === "signup" ? "signing up" : "signing in"} with {providerNames[provider]}
        </button>
      ))}
      <div className="authflow-divider"><span>or</span></div>
    </div>
  );
}

function ScreenHeading({ title, description }: { title: string; description: string }) {
  return <div className="authflow-heading"><h1>{title}</h1><p>{description}</p></div>;
}

function SubmitButton({ config, children }: { config: AuthFlowConfig; children: ReactNode }) {
  return <button className="authflow-submit" type="submit" style={{ backgroundColor: config.branding.primaryColor }}>{children}</button>;
}

function NavigationButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button className="authflow-inline-action" type="button" onClick={onClick}>{children}</button>;
}

function ScreenSwitch({ text, target, onNavigate }: { text: string; target: AuthFlowScreen; onNavigate?: (screen: AuthFlowScreen) => void }) {
  return <button className="authflow-screen-switch" type="button" onClick={() => onNavigate?.(target)}>{text}</button>;
}
