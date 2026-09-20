import type { AuthFlowConfig } from "@/modules/auth-config";

export type BuilderSection = "general" | "login" | "registration" | "verification" | "recovery" | "branding";
export type PreviewDevice = "desktop" | "mobile";
export type UpdateAuthConfig = (update: (draft: AuthFlowConfig) => void) => void;

export type BuilderProject = {
  id: string;
  version: number;
  config: AuthFlowConfig;
};
