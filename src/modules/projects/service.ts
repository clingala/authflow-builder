import { createHash, randomUUID } from "node:crypto";

import type { JsonValue, ProjectStore, ProjectView } from "./contracts";
import {
  createProjectSchema,
  projectIdSchema,
  saveConfigSchema,
  updateProjectSchema,
  type CreateProjectInput,
  type SaveConfigInput,
  type UpdateProjectInput,
} from "./validation";

export class ProjectNotFoundError extends Error {
  constructor() {
    super("Project not found");
    this.name = "ProjectNotFoundError";
  }
}

export class ProjectRevisionConflictError extends Error {
  constructor(public readonly currentVersion: number) {
    super("The project configuration has changed since it was loaded");
    this.name = "ProjectRevisionConflictError";
  }
}

function slugify(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);

  return `${base || "project"}-${randomUUID().slice(0, 8)}`;
}

function stableStringify(value: JsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key]!)}`)
    .join(",")}}`;
}

function hashConfig(config: JsonValue): string {
  return createHash("sha256").update(stableStringify(config)).digest("hex");
}

function toJsonValue(value: unknown): JsonValue {
  const encoded = JSON.stringify(value);
  if (encoded === undefined || encoded.length > 64 * 1024) {
    throw new Error("Configuration must be valid JSON smaller than 64 KiB");
  }
  return JSON.parse(encoded) as JsonValue;
}

function initialConfig(appName: string, accountType: string): JsonValue {
  return {
    schemaVersion: 1,
    app: { name: appName, accountType },
  };
}

export class ProjectService {
  constructor(private readonly store: ProjectStore) {}

  async create(ownerId: string, rawInput: CreateProjectInput): Promise<ProjectView> {
    const input = createProjectSchema.parse(rawInput);
    const config = initialConfig(input.name, input.accountType);
    return this.store.create({
      ownerId,
      name: input.name,
      slug: slugify(input.name),
      accountType: input.accountType,
      config,
      configHash: hashConfig(config),
    });
  }

  list(ownerId: string): Promise<ProjectView[]> {
    return this.store.list(ownerId);
  }

  async get(ownerId: string, rawProjectId: string): Promise<ProjectView> {
    const projectId = projectIdSchema.parse(rawProjectId);
    const project = await this.store.get(ownerId, projectId);
    if (!project) throw new ProjectNotFoundError();
    return project;
  }

  async update(ownerId: string, rawProjectId: string, rawInput: UpdateProjectInput): Promise<ProjectView> {
    const projectId = projectIdSchema.parse(rawProjectId);
    const input = updateProjectSchema.parse(rawInput);
    const project = await this.store.update(ownerId, projectId, input);
    if (!project) throw new ProjectNotFoundError();
    return project;
  }

  async archive(ownerId: string, rawProjectId: string): Promise<void> {
    const projectId = projectIdSchema.parse(rawProjectId);
    if (!(await this.store.archive(ownerId, projectId))) throw new ProjectNotFoundError();
  }

  async saveConfig(ownerId: string, rawProjectId: string, rawInput: SaveConfigInput): Promise<ProjectView> {
    const projectId = projectIdSchema.parse(rawProjectId);
    const input = saveConfigSchema.parse(rawInput);
    const config = toJsonValue(input.config);
    const result = await this.store.saveConfig(ownerId, projectId, input.expectedVersion, config, hashConfig(config));

    if (result.kind === "not_found") throw new ProjectNotFoundError();
    if (result.kind === "conflict") throw new ProjectRevisionConflictError(result.currentVersion);
    return result.project;
  }
}

