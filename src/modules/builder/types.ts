import type { AuthFlowConfig } from "@/modules/auth-config";

export type BuilderSection = "general" | "login" | "registration" | "verification" | "recovery" | "branding" | "integrations";
export type PreviewDevice = "desktop" | "mobile";
export type UpdateAuthConfig = (update: (draft: AuthFlowConfig) => void) => void;

export type BuilderProject = {
  id: string;
  version: number;
  config: AuthFlowConfig;
};

export type BuilderApplicationClient = {
  id: string;
  projectId: string;
  name: string;
  clientId: string;
  redirectUris: string[];
  allowedOrigins: string[];
  createdAt: string;
  updatedAt: string;
};
