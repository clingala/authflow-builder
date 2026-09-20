export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type ProjectStatus = "ACTIVE" | "ARCHIVED";

export type ProjectView = {
  id: string;
  name: string;
  slug: string;
  accountType: string;
  status: ProjectStatus;
  currentVersion: number;
  config: JsonValue;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateProjectRecord = {
  ownerId: string;
  name: string;
  slug: string;
  accountType: string;
  config: JsonValue;
  configHash: string;
};

export type UpdateProjectRecord = {
  name?: string;
  accountType?: string;
};

export type SaveConfigResult =
  | { kind: "saved"; project: ProjectView }
  | { kind: "not_found" }
  | { kind: "conflict"; currentVersion: number };

export interface ProjectStore {
  create(input: CreateProjectRecord): Promise<ProjectView>;
  list(ownerId: string): Promise<ProjectView[]>;
  get(ownerId: string, projectId: string): Promise<ProjectView | null>;
  update(ownerId: string, projectId: string, input: UpdateProjectRecord): Promise<ProjectView | null>;
  archive(ownerId: string, projectId: string): Promise<boolean>;
  saveConfig(
    ownerId: string,
    projectId: string,
    expectedVersion: number,
    config: JsonValue,
    configHash: string,
    projectMetadata: { name: string; accountType: string },
  ): Promise<SaveConfigResult>;
}
