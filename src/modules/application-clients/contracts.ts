import type { AuthFlowConfig } from "@/modules/auth-config";

export type ApplicationClient = {
  id: string;
  projectId: string;
  name: string;
  clientId: string;
  redirectUris: string[];
  allowedOrigins: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type PublicClientConfiguration = {
  client: Pick<ApplicationClient, "clientId" | "name">;
  projectId: string;
  configuration: AuthFlowConfig;
  endpoints: {
    hostedAuth: string;
    signUp: string;
    signIn: string;
    session: string;
    signOut: string;
    recoveryRequest: string;
    recoveryReset: string;
    verificationRequest: string;
    verificationConfirm: string;
    issuer: string;
    authorization: string;
    token: string;
    userInfo: string;
    discovery: string;
  };
};

export interface ApplicationClientStore {
  create(input: Omit<ApplicationClient, "id" | "createdAt" | "updatedAt"> & { ownerId: string }): Promise<ApplicationClient | null>;
  list(ownerId: string, projectId: string): Promise<ApplicationClient[]>;
  remove(ownerId: string, projectId: string, applicationClientId: string): Promise<boolean>;
  getPublic(clientId: string): Promise<(ApplicationClient & { config: unknown; projectActive: boolean }) | null>;
}
