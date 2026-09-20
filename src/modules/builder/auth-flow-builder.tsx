"use client";

import { useMemo, useState } from "react";

import { AuthFlowRenderer, type AuthFlowScreen } from "@/modules/renderer";

import { BrandingPanel } from "./branding-panel";
import { EmptyProperties, FieldProperties } from "./field-properties";
import { GeneralPanel } from "./general-panel";
import { LoginPanel } from "./login-panel";
import { RecoveryPanel } from "./recovery-panel";
import { RegistrationPanel } from "./registration-panel";
import type { BuilderProject, BuilderSection, PreviewDevice } from "./types";
import { useAuthBuilder } from "./use-auth-builder";
import { VerificationPanel } from "./verification-panel";

const sections: Array<{ id: BuilderSection; label: string }> = [
  { id: "general", label: "General" },
  { id: "login", label: "Login" },
  { id: "registration", label: "Registration" },
  { id: "verification", label: "Verification" },
  { id: "recovery", label: "Recovery" },
  { id: "branding", label: "Branding" },
];

const previewScreens: Array<{ id: AuthFlowScreen; label: string }> = [
  { id: "login", label: "Login" },
  { id: "signup", label: "Signup" },
  { id: "verification", label: "Verify" },
  { id: "recovery", label: "Recovery" },
];

export function AuthFlowBuilder({ project }: { project: BuilderProject }) {
  const builder = useAuthBuilder(project);
  const [section, setSection] = useState<BuilderSection>("general");
  const [selectedFieldId, setSelectedFieldId] = useState<string>();
  const [previewScreen, setPreviewScreen] = useState<AuthFlowScreen>("signup");
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const selectedField = useMemo(
    () => builder.draft.registration.fields.find((field) => field.id === selectedFieldId),
    [builder.draft.registration.fields, selectedFieldId],
  );

  function chooseSection(next: BuilderSection) {
    setSection(next);
    if (next === "login") setPreviewScreen("login");
    if (next === "registration") setPreviewScreen("signup");
    if (next === "verification") setPreviewScreen("verification");
    if (next === "recovery") setPreviewScreen("recovery");
  }

  return (
    <main className="auth-builder">
      <header className="auth-builder-header">
        <div className="auth-builder-title">
          <a href="/dashboard" aria-label="Back to projects">←</a>
          <div><p className="eyebrow">Authentication builder</p><h1>{builder.draft.app.name}</h1></div>
          <span>v{builder.version}</span>
        </div>
        <div className="auth-builder-actions">
          <span className={builder.dirty ? "dirty" : ""}>{builder.dirty ? "Unsaved changes" : builder.saveState === "saved" ? "Saved" : "Up to date"}</span>
          <button type="button" className="button secondary" disabled={!builder.dirty || builder.saveState === "saving"} onClick={builder.reset}>Discard</button>
          <button type="button" className="button primary" disabled={!builder.dirty || builder.saveState === "saving"} onClick={() => void builder.save()}>{builder.saveState === "saving" ? "Saving…" : "Save configuration"}</button>
        </div>
      </header>

      {builder.errors.length ? (
        <section className="builder-errors" aria-label="Configuration errors" role="alert">
          <strong>Resolve these issues before saving:</strong>
          <ul>{builder.errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </section>
      ) : null}

      <div className="auth-builder-workspace">
        <aside className="builder-sidebar" aria-label="Configuration controls">
          <nav aria-label="Builder sections">{sections.map((item) => <button className={section === item.id ? "active" : ""} type="button" key={item.id} onClick={() => chooseSection(item.id)}><span aria-hidden="true" />{item.label}</button>)}</nav>
          <div className="builder-controls-scroll">
            {section === "general" ? <GeneralPanel config={builder.draft} update={builder.update} /> : null}
            {section === "login" ? <LoginPanel config={builder.draft} update={builder.update} /> : null}
            {section === "registration" ? <RegistrationPanel config={builder.draft} update={builder.update} selectedFieldId={selectedFieldId} onSelectField={setSelectedFieldId} /> : null}
            {section === "verification" ? <VerificationPanel config={builder.draft} update={builder.update} /> : null}
            {section === "recovery" ? <RecoveryPanel config={builder.draft} update={builder.update} /> : null}
            {section === "branding" ? <BrandingPanel config={builder.draft} update={builder.update} /> : null}
          </div>
        </aside>

        <section className="builder-preview" aria-label="Live authentication preview">
          <header>
            <nav aria-label="Preview screen">{previewScreens.map((item) => <button className={previewScreen === item.id ? "active" : ""} type="button" key={item.id} onClick={() => setPreviewScreen(item.id)}>{item.label}</button>)}</nav>
            <div className="builder-device-toggle" aria-label="Preview device">
              <button type="button" className={device === "desktop" ? "active" : ""} aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>Desktop</button>
              <button type="button" className={device === "mobile" ? "active" : ""} aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>Mobile</button>
            </div>
          </header>
          <div className={`builder-preview-canvas device-${device}`}>
            <div><AuthFlowRenderer config={builder.draft} screen={previewScreen} onNavigate={setPreviewScreen} /></div>
          </div>
        </section>

        {selectedField ? <FieldProperties field={selectedField} update={builder.update} /> : <EmptyProperties config={builder.draft} />}
      </div>
    </main>
  );
}
