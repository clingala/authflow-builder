import { z } from "zod";
import { getApplicationClientService } from "@/modules/application-clients";
import { getRuntimeAuthService } from "@/modules/runtime-auth";
import type { OAuthProtocolAdapter } from "./contracts";

const challengeSchema = z.string().min(16).max(2048);

export class OAuthFlowMismatchError extends Error {}
export class OAuthFlowSessionRequiredError extends Error {}

export class OAuthPlatformService {
  constructor(private readonly protocol: OAuthProtocolAdapter, private readonly baseUrl: string) {}

  async loginContext(rawChallenge: string) {
    const challenge = challengeSchema.parse(rawChallenge);
    const request = await this.protocol.getLoginRequest(challenge);
    const client = await getApplicationClientService().getPublic(request.client.client_id, null, this.baseUrl);
    return { challenge, request, client };
  }

  async acceptLogin(rawChallenge: string, sessionToken: string | undefined) {
    const context = await this.loginContext(rawChallenge);
    const session = await getRuntimeAuthService().getSession(context.client.projectId, sessionToken);
    if (!session) throw new OAuthFlowSessionRequiredError();
    return this.protocol.acceptLogin(context.challenge, session.user.id);
  }

  async consentContext(rawChallenge: string) {
    const challenge = challengeSchema.parse(rawChallenge);
    const request = await this.protocol.getConsentRequest(challenge);
    const client = await getApplicationClientService().getPublic(request.client.client_id, null, this.baseUrl);
    const user = await getRuntimeAuthService().getUserById(client.projectId, request.subject);
    if (!user) throw new OAuthFlowMismatchError();
    return { challenge, request, client, user };
  }

  async acceptConsent(rawChallenge: string) {
    const context = await this.consentContext(rawChallenge);
    return this.protocol.acceptConsent(context.challenge, context.request.requested_scope, {
      sub: context.user.id, email: context.user.email, email_verified: context.user.emailVerified,
    });
  }

  rejectLogin(rawChallenge: string) { return this.protocol.rejectLogin(challengeSchema.parse(rawChallenge)); }
  rejectConsent(rawChallenge: string) { return this.protocol.rejectConsent(challengeSchema.parse(rawChallenge)); }
}
