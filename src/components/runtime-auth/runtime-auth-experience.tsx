"use client";

import { useState, type FormEvent } from "react";

import type { AuthFlowConfig } from "@/modules/auth-config";
import { AuthFlowRenderer, type AuthFlowScreen } from "@/modules/renderer";

type ApiPayload = {
  data: { user: { email: string }; verificationRequired?: boolean; verificationChannels?: Array<"email" | "phone"> } | null;
  error: { code: string; message: string; fields?: Record<string, string>; channels?: Array<"email" | "phone"> } | null;
};

export function RuntimeAuthExperience({ projectId, config }: { projectId: string; config: AuthFlowConfig }) {
  const [screen, setScreen] = useState<AuthFlowScreen>("login");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState<string>();
  const [pendingIdentifier, setPendingIdentifier] = useState<string>();
  const [pendingChannel, setPendingChannel] = useState<"email" | "phone">("email");
  const [recoveryMethod, setRecoveryMethod] = useState<AuthFlowConfig["recovery"]["methods"][number]>(config.recovery.methods[0] ?? "email_link");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setMessage(undefined);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    let endpoint = screen === "signup" ? "sign-up" : "sign-in";
    let body: Record<string, unknown> = screen === "signup"
      ? { fields: values }
      : { email: String(values.login_identifier ?? ""), password: String(values.login_password ?? "") };

    if (screen === "verification") {
      if (!pendingIdentifier) { setMessage("Request a new verification message by signing in again."); setSubmitting(false); return; }
      endpoint = "verification/confirm";
      body = { identifier: pendingIdentifier, channel: pendingChannel, secret: String(values.verification_code ?? "") };
    } else if (screen === "recovery") {
      const identifier = String(values.recovery_identifier ?? "");
      endpoint = "recovery/request";
      body = { identifier, method: recoveryMethod };
      setPendingIdentifier(identifier);
    } else if (screen === "recoveryReset") {
      endpoint = "recovery/reset";
      body = {
        identifier: pendingIdentifier ?? "",
        method: recoveryMethod,
        secret: String(values.recovery_secret ?? ""),
        password: String(values.recovery_password ?? ""),
        confirmPassword: String(values.recovery_confirm_password ?? ""),
      };
    }

    try {
      const response = await fetch(`/api/runtime/projects/${projectId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as ApiPayload;
      if (!response.ok || !payload.data) {
        if (payload.error?.code === "VERIFICATION_REQUIRED" && screen === "login") {
          const identifier = String(values.login_identifier ?? "");
          const channel = payload.error.channels?.[0] ?? "email";
          setPendingIdentifier(identifier);
          setPendingChannel(channel);
          const delivery = await fetch(`/api/runtime/projects/${projectId}/verification/request`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier, channel }),
          });
          if (delivery.ok) { setScreen("verification"); setMessage(config.messages.verificationRequired); return; }
          const deliveryPayload = await delivery.json() as ApiPayload;
          setMessage(deliveryPayload.error?.message ?? config.messages.networkError);
          return;
        }
        setErrors(payload.error?.fields ?? {});
        setMessage(payload.error?.code === "INVALID_CREDENTIALS" ? config.messages.invalidCredentials : payload.error?.message ?? config.messages.networkError);
        return;
      }
      if (screen === "recovery") {
        setMessage(config.messages.recoverySent);
        setScreen("recoveryReset");
        return;
      }
      if (screen === "recoveryReset") {
        setMessage("Your password has been reset. Sign in with your new password.");
        setScreen("login");
        return;
      }
      if (screen === "verification") {
        setMessage("Your account has been verified. You can now sign in.");
        setScreen("login");
        return;
      }
      if (payload.data.verificationRequired) {
        const email = payload.data.user.email;
        setPendingIdentifier(email);
        const channel = payload.data.verificationChannels?.[0] ?? "email";
        setPendingChannel(channel);
        const delivery = await fetch(`/api/runtime/projects/${projectId}/verification/request`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: email, channel }),
        });
        if (!delivery.ok) {
          const deliveryPayload = await delivery.json() as ApiPayload;
          setMessage(deliveryPayload.error?.message ?? config.messages.networkError);
          return;
        }
        setScreen("verification");
        setMessage(config.messages.verificationRequired);
        return;
      }
      setSignedInEmail(payload.data.user.email);
      setMessage(screen === "signup" ? config.messages.accountCreated : `Signed in to ${config.app.name}.`);
    } catch {
      setMessage(config.messages.networkError);
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    setSubmitting(true);
    try {
      await fetch(`/api/runtime/projects/${projectId}/sign-out`, { method: "POST" });
      setSignedInEmail(undefined);
      setMessage("Signed out.");
      setScreen("login");
    } catch {
      setMessage(config.messages.networkError);
    } finally {
      setSubmitting(false);
    }
  }

  if (signedInEmail) {
    return (
      <main className="runtime-auth-shell" style={{ background: config.branding.backgroundColor }}>
        <section className="runtime-session-card" aria-label={`${config.app.name} authenticated session`}>
          <span aria-hidden="true">✓</span>
          <h1>Welcome to {config.app.name}</h1>
          <p>Signed in as {signedInEmail}</p>
          <a className="button primary" href={screen === "signup" ? config.redirects.afterSignup : config.redirects.afterLogin}>Continue</a>
          <button className="button secondary" type="button" disabled={submitting} onClick={() => void signOut()}>Sign out</button>
        </section>
      </main>
    );
  }

  return (
    <main className="runtime-auth-shell" style={{ background: config.branding.backgroundColor }}>
      <div className="runtime-auth-frame">
        {message ? <div className="runtime-auth-message" role="status">{message}</div> : null}
        <AuthFlowRenderer
          config={config}
          screen={screen}
          errors={errors}
          submitting={submitting}
          onNavigate={(next) => {
            setScreen(next);
            if (next === "recovery") setRecoveryMethod(config.recovery.methods[0] ?? "email_link");
            setErrors({}); setMessage(undefined);
          }}
          onSubmit={submit}
        />
      </div>
    </main>
  );
}
