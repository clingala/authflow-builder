// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDefaultAuthFlowConfig, getAuthFlowTemplate, parseAuthFlowConfig } from "@/modules/auth-config";

import { AuthFlowRenderer } from "./auth-flow-renderer";

afterEach(cleanup);

describe("AuthFlowRenderer", () => {
  it("renders signup fields, terminology, social providers, and branding from configuration", () => {
    const config = getAuthFlowTemplate("delivery_application", "Suruchi Delivery");
    config.labels.signupTitle = "Join Suruchi";

    render(<AuthFlowRenderer config={config} screen="signup" />);

    expect(screen.getByRole("heading", { name: "Join Suruchi" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/)).toHaveAttribute("autocomplete", "name");
    expect(screen.getByLabelText(/Phone Number/)).toHaveAttribute("type", "tel");
    expect(screen.getByLabelText(/Delivery ZIP Code/)).toHaveAttribute("pattern", "[A-Za-z0-9 -]+");
    expect(screen.getByRole("button", { name: /signing up with Google/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: config.labels.signupAction })).toHaveStyle({ backgroundColor: config.branding.primaryColor });
  });

  it("uses one adapted identifier input for multi-identifier login", () => {
    const config = createDefaultAuthFlowConfig({ appName: "Member Hub", accountType: "Member" });
    config.registration.fields.splice(2, 0, {
      id: "phone",
      label: "Phone Number",
      type: "phone",
      required: true,
      width: "full",
      autocomplete: "tel",
    });
    config.login.identifiers = ["email", "phone"];
    const validated = parseAuthFlowConfig(config);

    render(<AuthFlowRenderer config={validated} screen="login" />);

    expect(screen.getByLabelText("Email or Phone *")).toHaveAttribute("name", "login_identifier");
    expect(screen.getByLabelText("Password *")).toHaveAttribute("autocomplete", "current-password");
  });

  it("exposes password visibility and policy feedback accessibly", () => {
    const config = createDefaultAuthFlowConfig({ appName: "Portal", accountType: "Applicant" });
    render(<AuthFlowRenderer config={config} screen="signup" />);

    const password = screen.getByLabelText("Password *");
    fireEvent.change(password, { target: { value: "SecurePassword9" } });
    expect(screen.getByLabelText(/Password strength/)).toHaveAttribute("aria-label", "Password strength 4 of 4");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();
  });

  it("associates configured field errors with invalid controls", () => {
    const config = createDefaultAuthFlowConfig({ appName: "Portal", accountType: "Customer" });
    render(<AuthFlowRenderer config={config} screen="signup" errors={{ email: "Enter a valid email address" }} />);

    const email = screen.getByLabelText("Email Address *");
    const error = screen.getByRole("alert");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email.getAttribute("aria-describedby")).toContain(error.id);
  });

  it("delegates screen and provider actions without implementing fake authentication", () => {
    const config = getAuthFlowTemplate("customer_portal", "Store");
    const navigate = vi.fn();
    const socialLogin = vi.fn();
    render(<AuthFlowRenderer config={config} screen="login" onNavigate={navigate} onSocialLogin={socialLogin} />);

    fireEvent.click(screen.getByRole("button", { name: config.labels.recoveryLink }));
    fireEvent.click(screen.getByRole("button", { name: /signing in with Google/ }));

    expect(navigate).toHaveBeenCalledWith("recovery");
    expect(socialLogin).toHaveBeenCalledWith("google");
  });

  it("renders OTP policy information only when an OTP channel is enabled", () => {
    const config = getAuthFlowTemplate("delivery_application", "Delivery App");
    render(<AuthFlowRenderer config={config} screen="verification" />);

    expect(screen.getByLabelText("Verification Code *")).toBeInTheDocument();
    expect(screen.getByText(/Codes expire after 10 minutes/)).toBeInTheDocument();
  });

  it("derives accessible button and focus colors from branding", () => {
    const config = createDefaultAuthFlowConfig({ appName: "Portal", accountType: "Member" });
    config.branding.primaryColor = "#F4D35E";
    const { container } = render(<AuthFlowRenderer config={config} screen="login" />);
    const renderer = container.querySelector<HTMLElement>(".authflow-renderer")!;
    expect(renderer.style.getPropertyValue("--authflow-primary-contrast")).toBe("#000000");
    expect(renderer.style.getPropertyValue("--authflow-focus")).toBe("#000000");
  });
});
