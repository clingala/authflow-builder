import { authFlowConfigSchema, type AuthFlowConfig } from "@/modules/auth-config";

const formatVersion = 1;

export type StoredBuilderDraft = {
  formatVersion: typeof formatVersion;
  projectId: string;
  baseVersion: number;
  updatedAt: string;
  config: AuthFlowConfig;
};

export function builderDraftKey(projectId: string) {
  return `authflow-builder:draft:${projectId}`;
}

export function readBuilderDraft(projectId: string): StoredBuilderDraft | null {
  const key = builderDraftKey(projectId);
  try {
    const value = window.localStorage.getItem(key);
    if (!value) return null;
    const candidate = JSON.parse(value) as Partial<StoredBuilderDraft>;
    const config = authFlowConfigSchema.safeParse(candidate.config);
    if (
      candidate.formatVersion !== formatVersion ||
      candidate.projectId !== projectId ||
      !Number.isInteger(candidate.baseVersion) ||
      Number(candidate.baseVersion) < 1 ||
      typeof candidate.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(candidate.updatedAt)) ||
      !config.success
    ) {
      removeBuilderDraft(projectId);
      return null;
    }

    return {
      formatVersion,
      projectId,
      baseVersion: candidate.baseVersion as number,
      updatedAt: candidate.updatedAt,
      config: config.data,
    };
  } catch {
    removeBuilderDraft(projectId);
    return null;
  }
}

export function writeBuilderDraft(projectId: string, baseVersion: number, config: AuthFlowConfig) {
  const draft: StoredBuilderDraft = {
    formatVersion,
    projectId,
    baseVersion,
    updatedAt: new Date().toISOString(),
    config,
  };
  try {
    window.localStorage.setItem(builderDraftKey(projectId), JSON.stringify(draft));
  } catch {
    // Browser storage can be unavailable or full; the in-memory draft remains authoritative.
  }
}

export function removeBuilderDraft(projectId: string) {
  try {
    window.localStorage.removeItem(builderDraftKey(projectId));
  } catch {
    // Storage cleanup is best effort when the browser blocks localStorage.
  }
}
