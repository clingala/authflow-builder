"use client";

import { useState, type FormEvent } from "react";

export type BuilderDeliveryConnection = { provider: "resend"; sender: string; configured: true; updatedAt: string } | null;
type Envelope = { data: BuilderDeliveryConnection; error: { message?: string; issues?: Array<{ message: string }> } | null };

export function DeliveryIntegrationsPanel({ projectId, initialConnection }: { projectId: string; initialConnection: BuilderDeliveryConnection }) {
  const [connection, setConnection] = useState(initialConnection);
  const [sender, setSender] = useState(initialConnection?.sender ?? "");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/delivery`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "resend", from: sender, apiKey }),
      });
      const body = await response.json() as Envelope;
      if (!response.ok || !body.data) throw new Error(body.error?.issues?.[0]?.message ?? body.error?.message ?? "Connection could not be saved");
      setConnection(body.data); setApiKey(""); setMessage("Email delivery connection saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Connection could not be saved"); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm("Remove this project's email delivery connection? Verification and recovery email will stop working.")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/delivery`, { method: "DELETE" });
      if (!response.ok) throw new Error("Connection could not be removed");
      setConnection(null); setApiKey(""); setMessage("Email delivery connection removed.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Connection could not be removed"); }
    finally { setBusy(false); }
  }

  return <section className="integration-clients" aria-label="Email delivery integration">
    <h3>Email delivery</h3>
    <p>Connect your own Resend account and verified sending domain. This project’s API key stays encrypted on the server and is never included in exports.</p>
    <p>{connection ? `Connected: Resend · ${connection.sender}` : "No email provider connected."}</p>
    <form className="integration-form" onSubmit={(event) => void save(event)}>
      <label htmlFor="delivery-sender">Verified sender address</label>
      <input id="delivery-sender" type="email" autoComplete="off" required maxLength={254} placeholder="no-reply@yourdomain.com" value={sender} onChange={(event) => setSender(event.currentTarget.value)} />
      <label htmlFor="delivery-api-key">Resend API key</label>
      <input id="delivery-api-key" type="password" autoComplete="off" required maxLength={512} value={apiKey} onChange={(event) => setApiKey(event.currentTarget.value)} />
      <small>Enter a new key to connect or rotate credentials. The saved key cannot be viewed again.</small>
      <button className="button primary" type="submit" disabled={busy}>{connection ? "Rotate connection" : "Connect Resend"}</button>
    </form>
    {connection ? <button className="button secondary" type="button" disabled={busy} onClick={() => void remove()}>Disconnect</button> : null}
    {message ? <p role="status">{message}</p> : null}
    <p>Phone OTP requires a separate SMS provider and is not enabled by this connection.</p>
  </section>;
}
