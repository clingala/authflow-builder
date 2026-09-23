import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { DeliveryConnectionService, DeliveryProjectNotFoundError } from "./service";

const projectId = "11111111-1111-4111-8111-111111111111";
const ownerId = "owner-a";

function fakePrisma(owned: boolean) {
  const connection = { provider: "RESEND", sender: "no-reply@example.com", credentialCipher: "cipher", updatedAt: new Date("2026-01-01T00:00:00Z") };
  const tx = {
    project: { findFirst: vi.fn(async () => owned ? { id: projectId, deliveryConnection: connection } : null) },
    deliveryConnection: { upsert: vi.fn(async () => connection), deleteMany: vi.fn(async () => ({ count: 1 })) },
    auditEvent: { create: vi.fn(async () => ({})) },
  };
  const prisma = { ...tx, $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
  return { prisma: prisma as unknown as PrismaClient, tx };
}

describe("project delivery connections", () => {
  it("returns only safe connection metadata to the owner", async () => {
    const { prisma, tx } = fakePrisma(true);
    const result = await new DeliveryConnectionService(prisma, "encryption-key").get(ownerId, projectId);
    expect(result).toEqual({ provider: "resend", sender: "no-reply@example.com", configured: true, updatedAt: "2026-01-01T00:00:00.000Z" });
    expect(JSON.stringify(result)).not.toContain("cipher");
    expect(tx.project.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: projectId, ownerId, status: "ACTIVE" } }));
  });

  it("rejects non-owner changes before writing credentials", async () => {
    const { prisma, tx } = fakePrisma(false);
    const service = new DeliveryConnectionService(prisma, "encryption-key");
    await expect(service.save(ownerId, projectId, { provider: "resend", from: "no-reply@example.com", apiKey: "re_secret" })).rejects.toThrow(DeliveryProjectNotFoundError);
    expect(tx.deliveryConnection.upsert).not.toHaveBeenCalled();
    expect(tx.auditEvent.create).not.toHaveBeenCalled();
  });

  it("rejects unsupported provider input", async () => {
    const { prisma, tx } = fakePrisma(true);
    const service = new DeliveryConnectionService(prisma, "encryption-key");
    await expect(service.save(ownerId, projectId, { provider: "sms", from: "no-reply@example.com", apiKey: "key" })).rejects.toThrow();
    expect(tx.deliveryConnection.upsert).not.toHaveBeenCalled();
  });
});
