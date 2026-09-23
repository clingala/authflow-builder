import { z } from "zod";

import type { PrismaClient } from "@/generated/prisma/client";
import { decryptDeliveryCredential, encryptDeliveryCredential } from "./crypto";
import { resendConnectionSchema, ResendDeliveryAdapter } from "./resend";

const projectIdSchema = z.string().uuid();
const connectionInputSchema = resendConnectionSchema.strict();

export class DeliveryProjectNotFoundError extends Error {}

export class DeliveryConnectionService {
  constructor(private readonly prisma: PrismaClient, private readonly encryptionKey: string) {}

  async get(ownerId: string, rawProjectId: string) {
    const projectId = projectIdSchema.parse(rawProjectId);
    const project = await this.prisma.project.findFirst({ where: { id: projectId, ownerId, status: "ACTIVE" }, include: { deliveryConnection: true } });
    if (!project) throw new DeliveryProjectNotFoundError();
    const connection = project.deliveryConnection;
    return connection ? { provider: "resend" as const, sender: connection.sender, configured: true as const, updatedAt: connection.updatedAt.toISOString() } : null;
  }

  async save(ownerId: string, rawProjectId: string, rawInput: unknown) {
    const projectId = projectIdSchema.parse(rawProjectId);
    const input = connectionInputSchema.parse(rawInput);
    const credentialCipher = encryptDeliveryCredential(input.apiKey, this.encryptionKey);
    await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.findFirst({ where: { id: projectId, ownerId, status: "ACTIVE" }, select: { id: true } });
      if (!project) throw new DeliveryProjectNotFoundError();
      await tx.deliveryConnection.upsert({
        where: { projectId },
        create: { projectId, provider: "RESEND", sender: input.from, credentialCipher },
        update: { provider: "RESEND", sender: input.from, credentialCipher },
      });
      await tx.auditEvent.create({ data: { actorId: ownerId, projectId, action: "delivery.connection.saved", targetType: "delivery_connection", targetId: projectId, metadata: { provider: "resend" } } });
    });
    return this.get(ownerId, projectId);
  }

  async remove(ownerId: string, rawProjectId: string) {
    const projectId = projectIdSchema.parse(rawProjectId);
    await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.findFirst({ where: { id: projectId, ownerId, status: "ACTIVE" }, select: { id: true } });
      if (!project) throw new DeliveryProjectNotFoundError();
      await tx.deliveryConnection.deleteMany({ where: { projectId } });
      await tx.auditEvent.create({ data: { actorId: ownerId, projectId, action: "delivery.connection.removed", targetType: "delivery_connection", targetId: projectId, metadata: { provider: "resend" } } });
    });
  }

  async adapterForProject(rawProjectId: string) {
    const projectId = projectIdSchema.parse(rawProjectId);
    const connection = await this.prisma.deliveryConnection.findFirst({ where: { projectId, project: { status: "ACTIVE" } } });
    if (!connection || connection.provider !== "RESEND") return null;
    return new ResendDeliveryAdapter({ provider: "resend", from: connection.sender, apiKey: decryptDeliveryCredential(connection.credentialCipher, this.encryptionKey) });
  }
}
