import { describe, expect, it } from "vitest";

import type { CreateProjectRecord, JsonValue, ProjectStore, ProjectView, SaveConfigResult } from "@/modules/projects/contracts";
import { ProjectService } from "@/modules/projects";

import { ToolAuthorizationError } from "./contracts";
import { AuthFlowToolService } from "./service";

class MemoryStore implements ProjectStore {
  readonly records = new Map<string, ProjectView>();
  private sequence = 0;

  async create(input: CreateProjectRecord): Promise<ProjectView> {
    this.sequence += 1;
    const id = `00000000-0000-4000-8000-${this.sequence.toString().padStart(12, "0")}`;
    const project: ProjectView = {
      id,
      name: input.name,
      slug: input.slug,
      accountType: input.accountType,
      status: "ACTIVE",
      currentVersion: 1,
      config: input.config,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.records.set(id, project);
    return project;
  }

  async list(ownerId: string): Promise<ProjectView[]> {
    return [...this.records.values()].filter((project) => (project as ProjectView & { ownerId?: string }).ownerId === ownerId);
  }

  async get(ownerId: string, projectId: string): Promise<ProjectView | null> {
    const project = this.records.get(projectId) as (ProjectView & { ownerId?: string }) | undefined;
    return project?.ownerId === ownerId ? project : null;
  }

  async update(): Promise<ProjectView | null> { return null; }
  async archive(): Promise<boolean> { return false; }

  async saveConfig(ownerId: string, projectId: string, expectedVersion: number, config: JsonValue, _hash: string, metadata: { name: string; accountType: string }): Promise<SaveConfigResult> {
    const project = await this.get(ownerId, projectId);
    if (!project) return { kind: "not_found" };
    if (project.currentVersion !== expectedVersion) return { kind: "conflict", currentVersion: project.currentVersion };
    project.currentVersion += 1;
    project.config = config;
    project.name = metadata.name;
    project.accountType = metadata.accountType;
    return { kind: "saved", project };
  }

  setOwner(projectId: string, ownerId: string) {
    Object.assign(this.records.get(projectId)!, { ownerId });
  }
}

function setup() {
  const store = new MemoryStore();
  const projects = new ProjectService(store);
  return { store, tools: new AuthFlowToolService(projects) };
}

const writeContext = { ownerId: "owner-a", scopes: new Set(["projects:read", "projects:write"] as const) };

describe("AuthFlow tool service", () => {
  it("creates and reads an owner-scoped project through structured tools", async () => {
    const { store, tools } = setup();
    const created = await tools.execute("create_auth_project", { name: "Applicant Hub", accountType: "Applicant" }, writeContext);
    store.setOwner(created.projectId, "owner-a");

    const read = await tools.execute("get_auth_project", { projectId: created.projectId }, writeContext);
    expect(read.config?.app).toEqual({ name: "Applicant Hub", accountType: "Applicant" });
    expect(read.version).toBe(1);
  });

  it("adds a validated field and persists through optimistic versioning", async () => {
    const { store, tools } = setup();
    const created = await tools.execute("create_auth_project", { name: "Portal", accountType: "Member" }, writeContext);
    store.setOwner(created.projectId, "owner-a");

    const updated = await tools.execute("add_registration_field", {
      projectId: created.projectId,
      expectedVersion: 1,
      field: { id: "member_code", label: "Member Code", type: "text", required: false, width: "half" },
    }, writeContext);

    expect(updated.version).toBe(2);
    expect(updated.config?.registration.fields.some((field) => field.id === "member_code")).toBe(true);
  });

  it("cannot remove a field required by the authentication security configuration", async () => {
    const { store, tools } = setup();
    const created = await tools.execute("create_auth_project", { name: "Portal", accountType: "Customer" }, writeContext);
    store.setOwner(created.projectId, "owner-a");

    await expect(tools.execute("remove_registration_field", {
      projectId: created.projectId,
      expectedVersion: 1,
      fieldId: "email",
    }, writeContext)).rejects.toThrow(/email must be a required registration field/i);
  });

  it("enforces declared scopes before reading project data", async () => {
    const { tools } = setup();
    await expect(tools.execute("get_auth_project", {
      projectId: "00000000-0000-4000-8000-000000000001",
    }, { ownerId: "owner-a", scopes: new Set() })).rejects.toBeInstanceOf(ToolAuthorizationError);
  });

  it("does not return another owner's project even when its ID is known", async () => {
    const { store, tools } = setup();
    const created = await tools.execute("create_auth_project", { name: "Private", accountType: "Patient" }, writeContext);
    store.setOwner(created.projectId, "owner-a");

    await expect(tools.execute("get_auth_project", { projectId: created.projectId }, {
      ownerId: "owner-b",
      scopes: new Set(["projects:read"]),
    })).rejects.toThrow("Project not found");
  });
});
