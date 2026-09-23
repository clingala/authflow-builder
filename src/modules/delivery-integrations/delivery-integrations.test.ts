import { describe, expect, it, vi } from "vitest";

import { decryptDeliveryCredential, DeliveryCredentialCipherError, encryptDeliveryCredential, ResendDeliveryAdapter } from ".";

describe("delivery integration security", () => {
  it("encrypts credentials with authenticated encryption", () => {
    const cipher = encryptDeliveryCredential("re_test_secret", "test-key-material");
    expect(cipher).not.toContain("re_test_secret");
    expect(decryptDeliveryCredential(cipher, "test-key-material")).toBe("re_test_secret");
    expect(() => decryptDeliveryCredential(cipher, "wrong-key")).toThrow(DeliveryCredentialCipherError);
  });

  it("sends only email messages through the configured Resend sender", async () => {
    let body = "";
    const request = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      body = String(init?.body);
      return new Response("{}", { status: 200 });
    });
    const adapter = new ResendDeliveryAdapter({ provider: "resend", from: "no-reply@example.com", apiKey: "re_test" }, request);
    expect(adapter.supportsChannel("email")).toBe(true);
    expect(adapter.supportsChannel("phone")).toBe(false);
    await adapter.deliver({ kind: "email_verification_otp", to: "person@example.com", code: "123456", expiresAt: new Date("2026-01-01T00:00:00Z") });
    expect(request).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
    expect(body).toContain("no-reply@example.com");
    await expect(adapter.deliver({ kind: "phone_verification_otp", to: "+15555550100", code: "123456", expiresAt: new Date() })).rejects.toThrow("does not deliver SMS");
  });
});
