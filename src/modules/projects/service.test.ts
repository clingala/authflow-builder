import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createDefaultAuthFlowConfig } from "@/modules/auth-config";

import type {
  CreateProjectRecord,
  JsonValue,
  ProjectStore,
  ProjectView,
  SaveConfigResult,
  UpdateProjectRecord,
} from "./contracts";
import { ProjectNotFoundError, ProjectService } from "./service";

type StoredProject = ProjectView & { ownerId: string };

class MemoryProjectStore implements ProjectStore {
  readonly projects = new Map<string, StoredProject>();

  async create(input: CreateProjectRecord): Promise<ProjectView> {
    const now = new Date("2026-09-20T00:00:00.000Z");
    const project: StoredProject = {
      id: randomUUID(),
      ownerId: input.ownerId,
      name: input.name,
      slug: input.slug,
      accountType: input.accountType,
      status: "ACTIVE",
      currentVersion: 1,
      config: input.config,
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(project.id, project);
    return project;
  }

  async list(ownerId: string): Promise<ProjectView[]> {
    return [...this.projects.values()].filter((project) => project.ownerId === ownerId && project.status === "ACTIVE");
  }

  async get(ownerId: string, projectId: string): Promise<ProjectView | null> {
    const project = this.projects.get(projectId);
    return project?.ownerId === ownerId && project.status === "ACTIVE" ? project : null;
  }

  async update(ownerId: string, projectId: string, input: UpdateProjectRecord): Promise<ProjectView | null> {
    const project = await this.get(ownerId, projectId);
    if (!project) return null;
    Object.assign(project, input);
    return project;
  }

  async archive(ownerId: string, projectId: string): Promise<boolean> {
    const project = await this.get(ownerId, projectId);
    if (!project) return false;
    project.status = "ARCHIVED";
    return true;
  }

  async saveConfig(
    ownerId: string,
    projectId: string,
    expectedVersion: number,
    config: JsonValue,
    _configHash: string,
    projectMetadata: { name: string; accountType: string },
  ): Promise<SaveConfigResult> {
    const project = await this.get(ownerId, projectId);
    if (!project) return { kind: "not_found" };
    if (project.currentVersion !== expectedVersion) {
      return { kind: "conflict", currentVersion: project.currentVersion };
    }
    project.currentVersion += 1;
    project.config = config;
    project.name = projectMetadata.name;
    project.accountType = projectMetadata.accountType;
    return { kind: "saved", project };
  }
}

describe("ProjectService authorization", () => {
  it("never returns another owner's project, even when its ID is known", async () => {
    const store = new MemoryProjectStore();
    const service = new ProjectService(store);
    const project = await service.create("owner-a", { name: "Customer Portal", accountType: "Customer" });

    await expect(service.get("owner-b", project.id)).rejects.toBeInstanceOf(ProjectNotFoundError);
    await expect(service.update("owner-b", project.id, { name: "Stolen" })).rejects.toBeInstanceOf(
      ProjectNotFoundError,
    );
    await expect(service.archive("owner-b", project.id)).rejects.toBeInstanceOf(ProjectNotFoundError);
    expect((await service.get("owner-a", project.id)).name).toBe("Customer Portal");
  });

  it("scopes project lists by owner", async () => {
    const store = new MemoryProjectStore();
    const service = new ProjectService(store);
    await service.create("owner-a", { name: "Alpha", accountType: "Member" });
    await service.create("owner-b", { name: "Beta", accountType: "Applicant" });

    expect((await service.list("owner-a")).map((project) => project.name)).toEqual(["Alpha"]);
  });
});

describe("ProjectService configuration versions", () => {
  it("rejects a stale expected version", async () => {
    const store = new MemoryProjectStore();
    const service = new ProjectService(store);
    const project = await service.create("owner-a", { name: "Portal", accountType: "Customer" });
    const config = createDefaultAuthFlowConfig({ appName: "Portal", accountType: "Customer" });
    config.labels.loginAction = "Continue";

    const saved = await service.saveConfig("owner-a", project.id, {
      expectedVersion: 1,
      config,
    });
    expect(saved.currentVersion).toBe(2);

    await expect(
      service.saveConfig("owner-a", project.id, {
        expectedVersion: 1,
        config,
      }),
    ).rejects.toEqual(expect.objectContaining({ currentVersion: 2 }));
  });

  it("keeps project metadata synchronized with the validated configuration", async () => {
    const store = new MemoryProjectStore();
    const service = new ProjectService(store);
    const project = await service.create("owner-a", { name: "Portal", accountType: "Customer" });
    const config = createDefaultAuthFlowConfig({ appName: "Hiring Hub", accountType: "Applicant" });

    const saved = await service.saveConfig("owner-a", project.id, {
      expectedVersion: 1,
      config,
    });

    expect(saved).toMatchObject({ name: "Hiring Hub", accountType: "Applicant", currentVersion: 2 });
  });

  it("rejects configurations over the Phase 2 safety limit", async () => {
    const store = new MemoryProjectStore();
    const service = new ProjectService(store);
    const project = await service.create("owner-a", { name: "Portal", accountType: "Customer" });

    await expect(
      service.saveConfig("owner-a", project.id, {
        expectedVersion: 1,
        config: { oversized: "x".repeat(70 * 1024) },
      }),
    ).rejects.toThrow(/64 KiB/);
  });
});
