"use client";

import { useState, type FormEvent } from "react";

import type { AuthFlowConfig } from "@/modules/auth-config";
import { AuthFlowRenderer, type AuthFlowScreen } from "@/modules/renderer";

type ApiPayload = {
  data: { user: { email: string }; verificationRequired?: boolean } | null;
  error: { code: string; message: string; fields?: Record<string, string> } | null;
};

export function RuntimeAuthExperience({ projectId, config }: { projectId: string; config: AuthFlowConfig }) {
  const [screen, setScreen] = useState<AuthFlowScreen>("login");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (screen !== "login" && screen !== "signup") return;
    setSubmitting(true);
    setErrors({});
    setMessage(undefined);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const body = screen === "signup"
      ? { fields: values }
      : { email: String(values.login_identifier ?? ""), password: String(values.login_password ?? "") };

    try {
      const response = await fetch(`/api/runtime/projects/${projectId}/${screen === "signup" ? "sign-up" : "sign-in"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as ApiPayload;
      if (!response.ok || !payload.data) {
        setErrors(payload.error?.fields ?? {});
        setMessage(payload.error?.code === "INVALID_CREDENTIALS" ? config.messages.invalidCredentials : payload.error?.message ?? config.messages.networkError);
        return;
      }
      if (payload.data.verificationRequired) {
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
          onNavigate={(next) => { setScreen(next); setErrors({}); setMessage(undefined); }}
          onSubmit={submit}
        />
      </div>
    </main>
  );
}
