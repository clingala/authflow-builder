import type { AuthFlowConfig } from "@/modules/auth-config";

export const exportTargets = ["config", "nextjs"] as const;
export type ExportTarget = (typeof exportTargets)[number];

export type ExportFile = {
  path: string;
  contentType: "application/json" | "text/markdown" | "text/typescript" | "text/plain";
  content: string;
};

export type NextJsExportBundle = {
  format: "authflow.nextjs.bundle";
  formatVersion: 1;
  projectId: string;
  projectVersion: number;
  generatedAt: string;
  files: ExportFile[];
};

export type ConfigExport = AuthFlowConfig;
