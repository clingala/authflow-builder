import { randomBytes } from "node:crypto";

import { parseAuthFlowConfig } from "@/modules/auth-config";

import type { ApplicationClientStore, PublicClientConfiguration } from "./contracts";
import { applicationClientIdSchema, createApplicationClientSchema, projectIdSchema, publicClientIdSchema, type CreateApplicationClientInput } from "./validation";

export class ApplicationClientNotFoundError extends Error {}
export class ApplicationClientOriginError extends Error {}

export class ApplicationClientService {
  constructor(private readonly store: ApplicationClientStore) {}

  async create(ownerId: string, rawProjectId: string, rawInput: CreateApplicationClientInput) {
    const projectId = projectIdSchema.parse(rawProjectId);
    const input = createApplicationClientSchema.parse(rawInput);
    const client = await this.store.create({
      ownerId,
      projectId,
      ...input,
      clientId: `af_pk_${randomBytes(32).toString("base64url")}`,
    });
    if (!client) throw new ApplicationClientNotFoundError();
    return client;
  }

  list(ownerId: string, rawProjectId: string) {
    return this.store.list(ownerId, projectIdSchema.parse(rawProjectId));
  }

  async remove(ownerId: string, rawProjectId: string, rawClientId: string) {
    const removed = await this.store.remove(ownerId, projectIdSchema.parse(rawProjectId), applicationClientIdSchema.parse(rawClientId));
    if (!removed) throw new ApplicationClientNotFoundError();
  }

  async getPublic(rawClientId: string, requestOrigin: string | null, baseUrl: string): Promise<PublicClientConfiguration> {
    const clientId = publicClientIdSchema.parse(rawClientId);
    const client = await this.store.getPublic(clientId);
    if (!client?.projectActive) throw new ApplicationClientNotFoundError();
    if (requestOrigin && !client.allowedOrigins.includes(requestOrigin)) throw new ApplicationClientOriginError();

    const configuration = parseAuthFlowConfig(client.config);
    const runtime = `${baseUrl}/api/runtime/projects/${client.projectId}`;
    return {
      client: { clientId: client.clientId, name: client.name },
      projectId: client.projectId,
      configuration,
      endpoints: {
        hostedAuth: `${baseUrl}/auth/${client.projectId}`,
        signUp: `${runtime}/sign-up`, signIn: `${runtime}/sign-in`, session: `${runtime}/session`, signOut: `${runtime}/sign-out`,
        recoveryRequest: `${runtime}/recovery/request`, recoveryReset: `${runtime}/recovery/reset`,
        verificationRequest: `${runtime}/verification/request`, verificationConfirm: `${runtime}/verification/confirm`,
      },
    };
  }
}
