// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultAuthFlowConfig } from "@/modules/auth-config";

import { AuthFlowBuilder } from "./auth-flow-builder";
import { builderDraftKey } from "./draft-storage";
import type { BuilderProject } from "./types";

function project(): BuilderProject {
  return {
    id: "891e05e7-26b1-42ef-8f7c-2c7722125342",
    version: 3,
    config: createDefaultAuthFlowConfig({ appName: "Customer Hub", accountType: "Customer" }),
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  window.localStorage.clear();
});

describe("AuthFlowBuilder", () => {
  it("renders the project draft, sections, preview screens, and version", () => {
    render(<AuthFlowBuilder project={project()} />);

    expect(screen.getAllByText("Customer Hub").length).toBeGreaterThan(0);
    expect(screen.getByText("v3")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Builder sections" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Live authentication preview" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Export JSON" })).toHaveAttribute(
      "href",
      "/api/v1/projects/891e05e7-26b1-42ef-8f7c-2c7722125342/config/export",
    );
    expect(screen.getByRole("link", { name: "Next.js starter" })).toHaveAttribute(
      "href",
      "/api/v1/projects/891e05e7-26b1-42ef-8f7c-2c7722125342/config/export?target=nextjs",
    );
    expect(screen.getByRole("button", { name: "Save configuration" })).toBeDisabled();
  });

  it("updates application metadata immediately in the local preview", () => {
    render(<AuthFlowBuilder project={project()} />);
    fireEvent.change(screen.getByLabelText("Application name"), { target: { value: "Applicant Central" } });

    expect(screen.getAllByText("Applicant Central").length).toBeGreaterThan(1);
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save configuration" })).toBeEnabled();
  });

  it("checkpoints unsaved changes in project-scoped browser storage", async () => {
    render(<AuthFlowBuilder project={project()} />);
    fireEvent.change(screen.getByLabelText("Application name"), { target: { value: "Locally Checkpointed" } });

    await waitFor(() => {
      const stored = JSON.parse(String(window.localStorage.getItem(builderDraftKey(project().id)))) as {
        baseVersion: number;
        config: BuilderProject["config"];
      };
      expect(stored.baseVersion).toBe(3);
      expect(stored.config.app.name).toBe("Locally Checkpointed");
    });
  });

  it("offers and restores a valid local draft based on the current server version", async () => {
    const recovered = project().config;
    recovered.app.name = "Recovered Workspace";
    window.localStorage.setItem(builderDraftKey(project().id), JSON.stringify({
      formatVersion: 1,
      projectId: project().id,
      baseVersion: 3,
      updatedAt: "2026-09-20T12:00:00.000Z",
      config: recovered,
    }));

    render(<AuthFlowBuilder project={project()} />);
    expect(await screen.findByRole("status", { name: "Recovered local draft" })).toHaveTextContent("Unsaved local draft available");
    fireEvent.click(screen.getByRole("button", { name: "Restore draft" }));

    expect(screen.getAllByText("Recovered Workspace").length).toBeGreaterThan(1);
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("does not restore a local draft based on an older server version", async () => {
    const recovered = project().config;
    recovered.app.name = "Stale Workspace";
    window.localStorage.setItem(builderDraftKey(project().id), JSON.stringify({
      formatVersion: 1,
      projectId: project().id,
      baseVersion: 2,
      updatedAt: "2026-09-20T12:00:00.000Z",
      config: recovered,
    }));

    render(<AuthFlowBuilder project={project()} />);
    expect(await screen.findByRole("status", { name: "Recovered local draft" })).toHaveTextContent("cannot be restored safely");
    expect(screen.queryByRole("button", { name: "Restore draft" })).not.toBeInTheDocument();
  });

  it("removes malformed local drafts instead of trusting browser storage", async () => {
    window.localStorage.setItem(builderDraftKey(project().id), JSON.stringify({
      formatVersion: 1,
      projectId: project().id,
      baseVersion: 3,
      updatedAt: "not-a-date",
      config: { injected: true },
    }));

    render(<AuthFlowBuilder project={project()} />);
    await waitFor(() => expect(window.localStorage.getItem(builderDraftKey(project().id))).toBeNull());
    expect(screen.queryByRole("status", { name: "Recovered local draft" })).not.toBeInTheDocument();
  });

  it("keeps the in-memory builder usable when browser storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("storage blocked"); });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("storage blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("storage blocked"); });

    render(<AuthFlowBuilder project={project()} />);
    fireEvent.change(screen.getByLabelText("Application name"), { target: { value: "Memory Only" } });

    expect(screen.getAllByText("Memory Only").length).toBeGreaterThan(1);
    await waitFor(() => expect(screen.getByText("Unsaved changes")).toBeInTheDocument());
  });

  it("adds, selects, edits, reorders, and removes registration fields", () => {
    render(<AuthFlowBuilder project={project()} />);
    fireEvent.click(screen.getByRole("button", { name: "Registration" }));
    fireEvent.change(screen.getByLabelText("Field type"), { target: { value: "textarea" } });
    fireEvent.click(screen.getByRole("button", { name: "Add field" }));

    const properties = screen.getByRole("complementary", { name: "Custom Textarea properties" });
    fireEvent.change(within(properties).getByLabelText("Label"), { target: { value: "About You" } });
    expect(screen.getByLabelText("About You")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Move About You up" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove About You" }));
    expect(screen.queryByLabelText("About You")).not.toBeInTheDocument();
  });

  it("blocks invalid drafts locally and explains semantic configuration errors", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<AuthFlowBuilder project={project()} />);
    fireEvent.click(screen.getByRole("button", { name: "Registration" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Email Address" }));
    fireEvent.click(screen.getByRole("button", { name: "Save configuration" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("email must be a required registration field");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves a validated draft using its expected version and adopts the returned version", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { expectedVersion: number; config: BuilderProject["config"] };
      return new Response(JSON.stringify({ data: { currentVersion: 4, config: body.config }, error: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AuthFlowBuilder project={project()} />);

    fireEvent.change(screen.getByLabelText("Application name"), { target: { value: "Customer Center" } });
    fireEvent.click(screen.getByRole("button", { name: "Save configuration" }));

    await waitFor(() => expect(screen.getByText("v4")).toBeInTheDocument());
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/projects/891e05e7-26b1-42ef-8f7c-2c7722125342/config",
      expect.objectContaining({ method: "PUT" }),
    );
    const request = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toMatchObject({ expectedVersion: 3, config: { app: { name: "Customer Center" } } });
  });

  it("surfaces optimistic-concurrency conflicts without replacing the draft", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      data: null,
      error: { code: "REVISION_CONFLICT", message: "The configuration was changed", currentVersion: 5 },
    }), { status: 409, headers: { "Content-Type": "application/json" } })));
    render(<AuthFlowBuilder project={project()} />);

    fireEvent.change(screen.getByLabelText("Application name"), { target: { value: "My Local Draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Save configuration" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("A newer version (5) exists");
    expect(screen.getAllByText("My Local Draft").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Replace with server v5" })).toBeInTheDocument();
  });

  it("can replace a conflicted draft with the latest validated server version", async () => {
    const latest = createDefaultAuthFlowConfig({ appName: "Latest Server Version", accountType: "Customer" });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: null,
        error: { code: "REVISION_CONFLICT", message: "The configuration was changed", currentVersion: 5 },
      }), { status: 409, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { version: 5, config: latest },
        error: null,
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AuthFlowBuilder project={project()} />);

    fireEvent.change(screen.getByLabelText("Application name"), { target: { value: "My Local Draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Save configuration" }));
    fireEvent.click(await screen.findByRole("button", { name: "Replace with server v5" }));

    await waitFor(() => expect(screen.getByText("v5")).toBeInTheDocument());
    expect(screen.getAllByText("Latest Server Version").length).toBeGreaterThan(1);
    expect(screen.getByText("Up to date")).toBeInTheDocument();
    expect(window.localStorage.getItem(builderDraftKey(project().id))).toBeNull();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/projects/891e05e7-26b1-42ef-8f7c-2c7722125342/config",
      { method: "GET" },
    );
  });
});
