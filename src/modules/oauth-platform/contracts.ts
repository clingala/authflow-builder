export type HydraClientInput = {
  clientId: string;
  name: string;
  projectId: string;
  redirectUris: string[];
  allowedOrigins: string[];
};

export type HydraLoginRequest = {
  challenge: string;
  skip: boolean;
  subject?: string;
  client: { client_id: string; client_name?: string };
};

export type HydraConsentRequest = {
  challenge: string;
  skip: boolean;
  subject: string;
  requested_scope: string[];
  client: { client_id: string; client_name?: string };
};

export interface OAuthProtocolAdapter {
  registerClient(input: HydraClientInput): Promise<void>;
  removeClient(clientId: string): Promise<void>;
  getLoginRequest(challenge: string): Promise<HydraLoginRequest>;
  acceptLogin(challenge: string, subject: string): Promise<string>;
  rejectLogin(challenge: string): Promise<string>;
  getConsentRequest(challenge: string): Promise<HydraConsentRequest>;
  acceptConsent(challenge: string, scopes: string[], claims: { sub: string; email: string; email_verified: boolean }): Promise<string>;
  rejectConsent(challenge: string): Promise<string>;
}
