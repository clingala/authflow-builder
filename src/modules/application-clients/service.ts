import { randomBytes } from "node:crypto";

import { parseAuthFlowConfig } from "@/modules/auth-config";
import type { OAuthProtocolAdapter } from "@/modules/oauth-platform";

import type { ApplicationClientStore, PublicClientConfiguration } from "./contracts";
import { applicationClientIdSchema, createApplicationClientSchema, projectIdSchema, publicClientIdSchema, type CreateApplicationClientInput } from "./validation";

export class ApplicationClientNotFoundError extends Error {}
export class ApplicationClientOriginError extends Error {}

export class ApplicationClientService {
  constructor(private readonly store: ApplicationClientStore, private readonly protocol?: OAuthProtocolAdapter) {}

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
    if (this.protocol) {
      try {
        await this.protocol.registerClient({
          clientId: client.clientId, name: client.name, projectId: client.projectId,
          redirectUris: client.redirectUris, allowedOrigins: client.allowedOrigins,
        });
      } catch (error) {
        await this.store.remove(ownerId, projectId, client.id);
        throw error;
      }
    }
    return client;
  }

  list(ownerId: string, rawProjectId: string) {
    return this.store.list(ownerId, projectIdSchema.parse(rawProjectId));
  }

  async remove(ownerId: string, rawProjectId: string, rawClientId: string) {
    const projectId = projectIdSchema.parse(rawProjectId);
    const applicationClientId = applicationClientIdSchema.parse(rawClientId);
    const clients = await this.store.list(ownerId, projectId);
    const client = clients.find((item) => item.id === applicationClientId);
    if (!client) throw new ApplicationClientNotFoundError();
    if (this.protocol) await this.protocol.removeClient(client.clientId);
    const removed = await this.store.remove(ownerId, projectId, applicationClientId);
    if (!removed) throw new ApplicationClientNotFoundError();
  }

  async getPublic(rawClientId: string, requestOrigin: string | null, baseUrl: string): Promise<PublicClientConfiguration> {
    const clientId = publicClientIdSchema.parse(rawClientId);
    const client = await this.store.getPublic(clientId);
    if (!client?.projectActive) throw new ApplicationClientNotFoundError();
    if (requestOrigin && !client.allowedOrigins.includes(requestOrigin)) throw new ApplicationClientOriginError();

    const configuration = parseAuthFlowConfig(client.config);
    const runtime = `${baseUrl}/api/runtime/projects/${client.projectId}`;
    const issuer = (process.env.HYDRA_PUBLIC_URL || baseUrl).replace(/\/$/, "");
    return {
      client: { clientId: client.clientId, name: client.name },
      projectId: client.projectId,
      configuration,
      endpoints: {
        hostedAuth: `${baseUrl}/auth/${client.projectId}`,
        signUp: `${runtime}/sign-up`, signIn: `${runtime}/sign-in`, session: `${runtime}/session`, signOut: `${runtime}/sign-out`,
        recoveryRequest: `${runtime}/recovery/request`, recoveryReset: `${runtime}/recovery/reset`,
        verificationRequest: `${runtime}/verification/request`, verificationConfirm: `${runtime}/verification/confirm`,
        issuer,
        authorization: `${issuer}/oauth2/auth`,
        token: `${issuer}/oauth2/token`,
        userInfo: `${issuer}/userinfo`,
        discovery: `${issuer}/.well-known/openid-configuration`,
      },
    };
  }
}
