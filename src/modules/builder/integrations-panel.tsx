"use client";

import { useState, type FormEvent } from "react";
import type { BuilderApplicationClient } from "./types";

type ApiEnvelope<T> = { data: T | null; error: { message?: string; issues?: Array<{ message: string }> } | null };

function lines(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

export function IntegrationsPanel({ projectId, initialClients }: { projectId: string; initialClients: BuilderApplicationClient[] }) {
  const [clients, setClients] = useState(initialClients);
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [redirectUri, setRedirectUri] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  async function createClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(undefined);
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, allowedOrigins: lines(origin), redirectUris: lines(redirectUri) }),
      });
      const body = await response.json() as ApiEnvelope<BuilderApplicationClient>;
      if (!response.ok || !body.data) throw new Error(body.error?.issues?.[0]?.message || body.error?.message || "Application could not be registered");
      setClients((current) => [...current, body.data!]);
      setName(""); setOrigin(""); setRedirectUri("");
      setMessage("Application registered. The client ID is public and safe to include in frontend code.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Application could not be registered");
    } finally { setBusy(false); }
  }

  async function removeClient(client: BuilderApplicationClient) {
    if (!window.confirm(`Revoke ${client.name}? Its configuration endpoint will stop working immediately.`)) return;
    setBusy(true); setMessage(undefined);
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/clients/${client.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Application could not be revoked");
      setClients((current) => current.filter((item) => item.id !== client.id));
      setMessage("Application access revoked.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Application could not be revoked");
    } finally { setBusy(false); }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setMessage("Copied to clipboard.");
  }

  return (
    <div className="builder-section-panel integrations-panel">
      <section>
        <p className="eyebrow">Platform integrations</p>
        <h2>Connect any application</h2>
        <p>Register browser origins and callback URLs once, then use the same HTTPS API from React, Java, Python, mobile, or any other language.</p>
      </section>

      <form className="integration-form" onSubmit={(event) => void createClient(event)}>
        <label htmlFor="integration-name"><span>Application name</span></label><input id="integration-name" required maxLength={80} value={name} placeholder="Customer web app" onChange={(event) => setName(event.currentTarget.value)} />
        <label htmlFor="integration-origins"><span>Allowed browser origins</span></label><textarea id="integration-origins" aria-describedby="integration-origins-help" required rows={3} value={origin} placeholder="https://app.example.com" onChange={(event) => setOrigin(event.currentTarget.value)} /><small id="integration-origins-help">One exact origin per line. No path.</small>
        <label htmlFor="integration-redirects"><span>Redirect URLs</span></label><textarea id="integration-redirects" aria-describedby="integration-redirects-help" required rows={3} value={redirectUri} placeholder="https://app.example.com/auth/callback" onChange={(event) => setRedirectUri(event.currentTarget.value)} /><small id="integration-redirects-help">One exact HTTPS callback per line. Localhost HTTP is allowed for development.</small>
        <button className="button primary" type="submit" disabled={busy}>{busy ? "Working…" : "Register application"}</button>
      </form>

      {message ? <p className="integration-message" role="status">{message}</p> : null}

      <section className="integration-clients" aria-label="Registered applications">
        <h3>Registered applications</h3>
        {clients.length === 0 ? <p>No applications registered yet.</p> : clients.map((client) => {
          const endpoint = `/api/platform/v1/clients/${client.clientId}/configuration`;
          return <article key={client.id}>
            <header><strong>{client.name}</strong><button type="button" disabled={busy} onClick={() => void removeClient(client)}>Revoke</button></header>
            <label>Public client ID</label>
            <div className="integration-copy"><code>{client.clientId}</code><button type="button" onClick={() => void copy(client.clientId)}>Copy</button></div>
            <label>Configuration endpoint</label>
            <div className="integration-copy"><code>{endpoint}</code><button type="button" onClick={() => void copy(endpoint)}>Copy</button></div>
            <details><summary>Registered URLs</summary><ul>{client.allowedOrigins.map((item) => <li key={item}>{item}</li>)}{client.redirectUris.map((item) => <li key={item}>{item}</li>)}</ul></details>
          </article>;
        })}
      </section>
    </div>
  );
}
