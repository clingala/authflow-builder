"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth/client";

type DashboardProject = {
  id: string;
  name: string;
  accountType: string;
  currentVersion: number;
  updatedAt: string;
};

export function ProjectDashboard({ ownerName, initialProjects }: { ownerName: string; initialProjects: DashboardProject[] }) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), accountType: form.get("accountType") }),
    });
    const payload = (await response.json()) as {
      data: (DashboardProject & { updatedAt: string }) | null;
      error: { message: string } | null;
    };
    setPending(false);
    if (!response.ok || !payload.data) {
      setError(payload.error?.message ?? "Unable to create the project");
      return;
    }
    setProjects((current) => [payload.data!, ...current]);
    event.currentTarget.reset();
  }

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <main className="dashboard-screen">
      <header className="dashboard-header">
        <div><p className="eyebrow">Owner workspace</p><h1>{ownerName}&apos;s projects</h1></div>
        <div className="topbar-actions">
          <a className="button secondary" href="/preview">Renderer preview</a>
          <button className="button secondary" type="button" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <section className="create-project" aria-labelledby="create-title">
        <div><p className="eyebrow">New project</p><h2 id="create-title">Start an authentication flow</h2></div>
        <form onSubmit={createProject}>
          <label>Application name<input name="name" required maxLength={80} placeholder="Example Store" /></label>
          <label>Account type<input name="accountType" required maxLength={50} placeholder="Customer" /></label>
          <button className="button primary" type="submit" disabled={pending}>{pending ? "Creating…" : "Create project"}</button>
        </form>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </section>
      <section className="project-list" aria-labelledby="projects-title">
        <div className="section-heading"><div><p className="eyebrow">Projects</p><h2 id="projects-title">Authentication workspaces</h2></div><span>{projects.length}</span></div>
        {projects.length === 0 ? (
          <div className="empty-projects"><h3>No projects yet</h3><p>Create one above to establish its owner-scoped configuration.</p></div>
        ) : (
          <div className="project-grid">
            {projects.map((project) => (
              <article className="project-card" key={project.id}>
                <span className="pill dark">{project.accountType}</span>
                <h3>{project.name}</h3>
                <p>Configuration version {project.currentVersion}</p>
                <div className="project-card-footer">
                  <small>Updated {new Date(project.updatedAt).toLocaleDateString()}</small>
                  <a className="button secondary" href={`/dashboard/projects/${project.id}/builder`}>Open builder</a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
