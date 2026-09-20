// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDefaultAuthFlowConfig } from "@/modules/auth-config";

import { AuthFlowBuilder } from "./auth-flow-builder";
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
  vi.unstubAllGlobals();
});

describe("AuthFlowBuilder", () => {
  it("renders the project draft, sections, preview screens, and version", () => {
    render(<AuthFlowBuilder project={project()} />);

    expect(screen.getAllByText("Customer Hub").length).toBeGreaterThan(0);
    expect(screen.getByText("v3")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Builder sections" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Live authentication preview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save configuration" })).toBeDisabled();
  });

  it("updates application metadata immediately in the local preview", () => {
    render(<AuthFlowBuilder project={project()} />);
    fireEvent.change(screen.getByLabelText("Application name"), { target: { value: "Applicant Central" } });

    expect(screen.getAllByText("Applicant Central").length).toBeGreaterThan(1);
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save configuration" })).toBeEnabled();
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
  });
});
