"use client";

import { useState } from "react";

import { getAuthFlowTemplate } from "@/modules/auth-config";
import { AuthFlowRenderer, type AuthFlowScreen } from "@/modules/renderer";

const demoConfig = getAuthFlowTemplate("delivery_application", "Suruchi Delivery");

const screens: Array<{ id: AuthFlowScreen; label: string }> = [
  { id: "login", label: "Login" },
  { id: "signup", label: "Signup" },
  { id: "verification", label: "Verification" },
  { id: "recovery", label: "Recovery" },
];

export function AuthFlowDemo() {
  const [screen, setScreen] = useState<AuthFlowScreen>("signup");

  return (
    <main className="renderer-demo">
      <header className="renderer-demo-header">
        <div>
          <p className="eyebrow">Phase 4 renderer</p>
          <h1>Configuration-driven authentication</h1>
          <p>This preview uses the Delivery Application template. Controls switch screens; forms do not execute authentication.</p>
        </div>
        <a className="button secondary" href="/dashboard">Back to dashboard</a>
      </header>
      <nav className="renderer-demo-tabs" aria-label="Authentication preview screen">
        {screens.map((item) => (
          <button className={screen === item.id ? "active" : ""} key={item.id} onClick={() => setScreen(item.id)} type="button">
            {item.label}
          </button>
        ))}
      </nav>
      <div className="renderer-demo-stage">
        <AuthFlowRenderer config={demoConfig} screen={screen} onNavigate={setScreen} />
      </div>
    </main>
  );
}
