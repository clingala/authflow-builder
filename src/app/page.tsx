const navigation = [
  { label: "Projects", active: true },
  { label: "Templates", active: false },
  { label: "Integrations", active: false },
  { label: "Security", active: false },
];

const phases = [
  { name: "Foundation", detail: "Architecture, tooling, and security baseline", state: "Complete" },
  { name: "Project data", detail: "Owner-scoped projects and version-ready config", state: "Complete" },
  { name: "Config engine", detail: "Validated schema and dynamic form contracts", state: "Complete" },
  { name: "Dynamic renderer", detail: "Accessible, responsive authentication screens", state: "Complete" },
  { name: "Visual builder", detail: "Typed controls, field editing, and persisted live preview", state: "Complete" },
  { name: "Preview workflow", detail: "Recoverable drafts and safe revision-conflict handling", state: "Complete" },
  { name: "Authentication runtime", detail: "Tenant-scoped email/password identities and sessions", state: "Complete" },
  { name: "Verification & recovery", detail: "Hashed challenges, delivery adapters, and reset transactions", state: "Complete" },
];

export default function Home() {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <a className="brand" href="#main" aria-label="AuthFlow Builder home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>AuthFlow</span>
        </a>

        <nav className="nav-list">
          <p className="eyebrow">Workspace</p>
          {navigation.map((item) => (
            <a className={item.active ? "nav-item active" : "nav-item"} href={`#${item.label.toLowerCase()}`} key={item.label}>
              <span className="nav-dot" aria-hidden="true" />
              {item.label}
            </a>
          ))}
        </nav>

        <div className="sidebar-note">
          <span className="status-dot" aria-hidden="true" />
          <div><strong>Phase 8 ready</strong><small>Verification and recovery controls delivered</small></div>
        </div>
      </aside>

      <main id="main" className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Authentication infrastructure</p>
            <h1>Projects</h1>
          </div>
          <div className="topbar-actions">
            <a className="button secondary" href="/api/health">System health</a>
            <a className="button secondary" href="/preview">Renderer preview</a>
            <a className="button primary" href="/sign-up">New project</a>
          </div>
        </header>

        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="pill">Configuration-first</span>
            <h2 id="hero-title">Build auth that speaks your product&apos;s language.</h2>
            <p>Create secure login, registration, verification, and recovery flows for Customers, Applicants, Members—or any account type you define.</p>
            <div className="hero-actions">
              <a className="button light" href="/sign-up">Create a workspace</a>
              <a className="text-link" href="/sign-in">Sign in</a>
            </div>
          </div>
          <div className="config-card" aria-label="Configuration example">
            <div className="config-card-header"><span /><span /><span /><code>authflow.config</code></div>
            <pre>{`{
  "accountType": "Customer",
  "labels": {
    "login": "Sign In",
    "signup": "Create Account"
  },
  "verification": ["email", "phone"]
}`}</pre>
          </div>
        </section>

        <section id="roadmap" className="section-block" aria-labelledby="roadmap-title">
          <div className="section-heading">
            <div><p className="eyebrow">Build status</p><h2 id="roadmap-title">A production foundation, built in phases</h2></div>
            <span className="phase-counter">08 / 15</span>
          </div>
          <div className="phase-grid">
            {phases.map((phase, index) => (
              <article className="phase-card" key={phase.name}>
                <div className="phase-number">0{index + 1}</div>
                <div><h3>{phase.name}</h3><p>{phase.detail}</p></div>
                <span className={`state state-${phase.state.toLowerCase()}`}>{phase.state}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="principles" aria-label="Product principles">
          <article><span aria-hidden="true">◇</span><div><h3>Configuration-driven</h3><p>One validated model powers builder controls, previews, runtime UI, exports, and tools.</p></div></article>
          <article><span aria-hidden="true">⌁</span><div><h3>Security boundaries</h3><p>The model may propose configuration; server-side policy owns validation and execution.</p></div></article>
          <article><span aria-hidden="true">◫</span><div><h3>Accessible by default</h3><p>Semantic, keyboard-friendly experiences targeting WCAG 2.2 AA.</p></div></article>
        </section>
      </main>
    </div>
  );
}
