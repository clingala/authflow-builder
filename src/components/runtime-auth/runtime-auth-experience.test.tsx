// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDefaultAuthFlowConfig } from "@/modules/auth-config";

import { RuntimeAuthExperience } from "./runtime-auth-experience";

const projectId = "11111111-1111-4111-8111-111111111111";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("RuntimeAuthExperience", () => {
  it("submits configured registration fields to the project-scoped signup endpoint", async () => {
    const config = createDefaultAuthFlowConfig({ appName: "Customer Portal", accountType: "Customer" });
    const fetchMock = vi.fn(async (...request: [string, RequestInit?]) => {
      void request;
      return new Response(JSON.stringify({
        data: { user: { email: "member@example.test" }, verificationRequired: false },
        error: null,
      }), { status: 201, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<RuntimeAuthExperience projectId={projectId} config={config} />);

    fireEvent.click(screen.getByRole("button", { name: config.labels.newAccount }));
    fireEvent.change(screen.getByLabelText("Full Name *"), { target: { value: "Test Member" } });
    fireEvent.change(screen.getByLabelText("Email Address *"), { target: { value: "member@example.test" } });
    fireEvent.change(screen.getByLabelText("Password *", { selector: "input[name=password]" }), { target: { value: "SecurePassword9" } });
    fireEvent.change(screen.getByLabelText("Confirm Password *"), { target: { value: "SecurePassword9" } });
    fireEvent.click(screen.getByRole("button", { name: config.labels.signupAction }));

    await screen.findByRole("region", { name: "Customer Portal authenticated session" });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/runtime/projects/${projectId}/sign-up`,
      expect.objectContaining({ method: "POST" }),
    );
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({ fields: {
      full_name: "Test Member",
      email: "member@example.test",
      password: "SecurePassword9",
      confirm_password: "SecurePassword9",
    } });
  });

  it("uses the configured generic invalid-credentials message", async () => {
    const config = createDefaultAuthFlowConfig({ appName: "Customer Portal", accountType: "Customer" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      data: null,
      error: { code: "INVALID_CREDENTIALS", message: "internal detail" },
    }), { status: 401, headers: { "Content-Type": "application/json" } })));
    render(<RuntimeAuthExperience projectId={projectId} config={config} />);

    fireEvent.change(screen.getByLabelText("Email Address *"), { target: { value: "member@example.test" } });
    fireEvent.change(screen.getByLabelText("Password *"), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: config.labels.loginAction }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(config.messages.invalidCredentials));
    expect(screen.queryByText("internal detail")).not.toBeInTheDocument();
  });
});
