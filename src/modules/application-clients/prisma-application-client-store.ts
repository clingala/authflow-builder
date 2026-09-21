import type { PrismaClient } from "@/generated/prisma/client";
import type { ApplicationClient, ApplicationClientStore } from "./contracts";

export class PrismaApplicationClientStore implements ApplicationClientStore {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: Omit<ApplicationClient, "id" | "createdAt" | "updatedAt"> & { ownerId: string }) {
    const project = await this.prisma.project.findFirst({ where: { id: input.projectId, ownerId: input.ownerId, status: "ACTIVE" }, select: { id: true } });
    if (!project) return null;
    const client = await this.prisma.applicationClient.create({ data: { projectId: input.projectId, name: input.name, clientId: input.clientId, redirectUris: input.redirectUris, allowedOrigins: input.allowedOrigins } });
    await this.prisma.auditEvent.create({ data: { actorId: input.ownerId, projectId: input.projectId, action: "application_client.created", targetType: "application_client", targetId: client.id } });
    return client;
  }

  list(ownerId: string, projectId: string) {
    return this.prisma.applicationClient.findMany({ where: { projectId, project: { ownerId, status: "ACTIVE" } }, orderBy: { createdAt: "asc" } });
  }

  async remove(ownerId: string, projectId: string, applicationClientId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const client = await transaction.applicationClient.findFirst({ where: { id: applicationClientId, projectId, project: { ownerId, status: "ACTIVE" } } });
      if (!client) return false;
      await transaction.applicationClient.delete({ where: { id: client.id } });
      await transaction.auditEvent.create({ data: { actorId: ownerId, projectId, action: "application_client.deleted", targetType: "application_client", targetId: client.id } });
      return true;
    });
  }

  async getPublic(clientId: string) {
    const client = await this.prisma.applicationClient.findUnique({ where: { clientId }, include: { project: { include: { activeConfig: true } } } });
    if (!client?.project.activeConfig) return null;
    return { ...client, config: client.project.activeConfig.config, projectActive: client.project.status === "ACTIVE" };
  }
}
