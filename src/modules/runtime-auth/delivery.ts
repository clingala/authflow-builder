export type DeliveryMessage =
  | { kind: "email_verification_link"; to: string; link: string; expiresAt: Date }
  | { kind: "email_verification_otp"; to: string; code: string; expiresAt: Date }
  | { kind: "phone_verification_otp"; to: string; code: string; expiresAt: Date }
  | { kind: "password_recovery_link"; to: string; link: string; expiresAt: Date }
  | { kind: "password_recovery_otp"; to: string; code: string; expiresAt: Date };

export interface RuntimeDeliveryAdapter {
  readonly available: boolean;
  deliver(message: DeliveryMessage): Promise<void>;
}

export class RuntimeDeliveryUnavailableError extends Error {
  constructor() { super("The required delivery provider is not configured."); }
}

export class DisabledDeliveryAdapter implements RuntimeDeliveryAdapter {
  readonly available = false;
  async deliver(): Promise<never> { throw new RuntimeDeliveryUnavailableError(); }
}

/** Vendor-neutral HTTPS adapter. The configured server endpoint owns provider credentials. */
export class HttpDeliveryAdapter implements RuntimeDeliveryAdapter {
  readonly available = true;
  constructor(private readonly endpoint: string, private readonly bearerToken: string) {}

  async deliver(message: DeliveryMessage) {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.bearerToken}` },
      body: JSON.stringify({ ...message, expiresAt: message.expiresAt.toISOString() }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Delivery provider returned ${response.status}.`);
  }
}
