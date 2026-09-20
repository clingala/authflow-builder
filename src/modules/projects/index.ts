import { getPrisma } from "@/lib/db/prisma";

import { PrismaProjectStore } from "./prisma-project-store";
import { ProjectService } from "./service";

let projectService: ProjectService | undefined;

export function getProjectService(): ProjectService {
  projectService ??= new ProjectService(new PrismaProjectStore(getPrisma()));
  return projectService;
}

export { ProjectNotFoundError, ProjectRevisionConflictError, ProjectService } from "./service";
export type { JsonValue, ProjectStore, ProjectView } from "./contracts";
