import { z } from "zod";

import type { DeliveryMessage, RuntimeDeliveryAdapter } from "@/modules/runtime-auth/delivery";

export const resendConnectionSchema = z.object({
  provider: z.literal("resend"),
  from: z.string().email().max(254),
  apiKey: z.string().min(1).max(512),
});

export type ResendConnection = z.infer<typeof resendConnectionSchema>;
type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class ResendDeliveryAdapter implements RuntimeDeliveryAdapter {
  readonly available = true;
  constructor(private readonly connection: ResendConnection, private readonly request: Fetcher = fetch) {}

  supportsChannel(channel: "email" | "phone") { return channel === "email"; }

  async deliver(message: DeliveryMessage) {
    if (message.kind === "phone_verification_otp") throw new Error("Resend does not deliver SMS messages.");
    const subject = message.kind.startsWith("password_recovery") ? "Reset your password" : "Verify your email address";
    const content = "link" in message
      ? `Use this secure link before ${message.expiresAt.toISOString()}: ${message.link}`
      : `Your verification code is ${message.code}. It expires at ${message.expiresAt.toISOString()}.`;
    const response = await this.request("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.connection.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: this.connection.from, to: [message.to], subject, text: content }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Delivery provider returned ${response.status}.`);
  }
}
