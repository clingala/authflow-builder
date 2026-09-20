import type { Prisma, PrismaClient } from "@/generated/prisma/client";

import type {
  CreateProjectRecord,
  JsonValue,
  ProjectStore,
  ProjectView,
  SaveConfigResult,
  UpdateProjectRecord,
} from "./contracts";

type ProjectWithConfig = Prisma.ProjectGetPayload<{
  include: { activeConfig: true };
}>;

function asInputJson(value: JsonValue): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function asJsonValue(value: Prisma.JsonValue): JsonValue {
  return value as JsonValue;
}

function mapProject(project: ProjectWithConfig): ProjectView {
  if (!project.activeConfig) throw new Error("Project has no active configuration");
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    accountType: project.accountType,
    status: project.status,
    currentVersion: project.activeConfig.version,
    config: asJsonValue(project.activeConfig.config),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export class PrismaProjectStore implements ProjectStore {
  constructor(private readonly prisma: PrismaClient) {}

  create(input: CreateProjectRecord): Promise<ProjectView> {
    return this.prisma.$transaction(async (transaction) => {
      const project = await transaction.project.create({
        data: {
          ownerId: input.ownerId,
          name: input.name,
          slug: input.slug,
          accountType: input.accountType,
        },
      });
      const config = await transaction.authConfigVersion.create({
        data: {
          projectId: project.id,
          version: 1,
          schemaVersion: 1,
          config: asInputJson(input.config),
          configHash: input.configHash,
          createdById: input.ownerId,
        },
      });
      const updated = await transaction.project.update({
        where: { id: project.id },
        data: { activeConfigId: config.id },
        include: { activeConfig: true },
      });
      await transaction.auditEvent.create({
        data: {
          actorId: input.ownerId,
          projectId: project.id,
          action: "project.created",
          targetType: "project",
          targetId: project.id,
          metadata: { version: 1 },
        },
      });
      return mapProject(updated);
    });
  }

  async list(ownerId: string): Promise<ProjectView[]> {
    const projects = await this.prisma.project.findMany({
      where: { ownerId, status: "ACTIVE" },
      include: { activeConfig: true },
      orderBy: { updatedAt: "desc" },
    });
    return projects.map(mapProject);
  }

  async get(ownerId: string, projectId: string): Promise<ProjectView | null> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ownerId, status: "ACTIVE" },
      include: { activeConfig: true },
    });
    return project ? mapProject(project) : null;
  }

  async update(ownerId: string, projectId: string, input: UpdateProjectRecord): Promise<ProjectView | null> {
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.project.findFirst({ where: { id: projectId, ownerId, status: "ACTIVE" } });
      if (!existing) return null;
      const project = await transaction.project.update({
        where: { id: projectId },
        data: input,
        include: { activeConfig: true },
      });
      await transaction.auditEvent.create({
        data: {
          actorId: ownerId,
          projectId,
          action: "project.updated",
          targetType: "project",
          targetId: projectId,
          metadata: { fields: Object.keys(input) },
        },
      });
      return mapProject(project);
    });
  }

  async archive(ownerId: string, projectId: string): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.project.updateMany({
        where: { id: projectId, ownerId, status: "ACTIVE" },
        data: { status: "ARCHIVED", archivedAt: new Date() },
      });
      if (result.count === 0) return false;
      await transaction.auditEvent.create({
        data: {
          actorId: ownerId,
          projectId,
          action: "project.archived",
          targetType: "project",
          targetId: projectId,
        },
      });
      return true;
    });
  }

  saveConfig(
    ownerId: string,
    projectId: string,
    expectedVersion: number,
    config: JsonValue,
    configHash: string,
  ): Promise<SaveConfigResult> {
    return this.saveConfigTransaction(ownerId, projectId, expectedVersion, config, configHash).catch(async (error) => {
      if (!isUniqueConstraintError(error)) throw error;
      const latest = await this.prisma.project.findFirst({
        where: { id: projectId, ownerId, status: "ACTIVE" },
        include: { activeConfig: true },
      });
      if (!latest?.activeConfig) return { kind: "not_found" };
      return { kind: "conflict", currentVersion: latest.activeConfig.version };
    });
  }

  private saveConfigTransaction(
    ownerId: string,
    projectId: string,
    expectedVersion: number,
    config: JsonValue,
    configHash: string,
  ): Promise<SaveConfigResult> {
    return this.prisma.$transaction(async (transaction) => {
        const project = await transaction.project.findFirst({
          where: { id: projectId, ownerId, status: "ACTIVE" },
          include: { activeConfig: true },
        });
        if (!project?.activeConfig) return { kind: "not_found" };
        if (project.activeConfig.version !== expectedVersion) {
          return { kind: "conflict", currentVersion: project.activeConfig.version };
        }

        const nextVersion = expectedVersion + 1;
        const version = await transaction.authConfigVersion.create({
          data: {
            projectId,
            version: nextVersion,
            schemaVersion: 1,
            config: asInputJson(config),
            configHash,
            createdById: ownerId,
          },
        });
        const updated = await transaction.project.update({
          where: { id: projectId },
          data: { activeConfigId: version.id },
          include: { activeConfig: true },
        });
        await transaction.auditEvent.create({
          data: {
            actorId: ownerId,
            projectId,
            action: "config.version.created",
            targetType: "auth_config_version",
            targetId: version.id,
            metadata: { version: nextVersion, configHash },
          },
        });
        return { kind: "saved", project: mapProject(updated) };
      });
  }
}

function isUniqueConstraintError(error: unknown): error is { code: "P2002" } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
