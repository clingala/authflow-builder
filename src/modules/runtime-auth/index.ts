import { getPrisma } from "@/lib/db/prisma";
import { readAuthEnvironment } from "@/lib/env/runtime";

import { betterAuthPasswordHasher } from "./password";
import { PrismaRuntimeAuthStore } from "./prisma-runtime-auth-store";
import { RuntimeAuthService } from "./service";
import { RuntimeChallengeService } from "./challenge-service";
import { DisabledDeliveryAdapter, HttpDeliveryAdapter } from "./delivery";
import { GoogleOAuthHttpAdapter, PrismaRuntimeOAuthStore, RuntimeOAuthService, RuntimeOAuthUnavailableError } from "./oauth";

let service: RuntimeAuthService | undefined;
let challengeService: RuntimeChallengeService | undefined;
let oauthService: RuntimeOAuthService | undefined;

export function getRuntimeAuthService() {
  service ??= new RuntimeAuthService(
    new PrismaRuntimeAuthStore(getPrisma()),
    betterAuthPasswordHasher,
    readAuthEnvironment().AUTH_SECRET,
  );
  return service;
}

export function getRuntimeOAuthService() {
  const environment = readAuthEnvironment();
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new RuntimeOAuthUnavailableError();
  oauthService ??= new RuntimeOAuthService(new PrismaRuntimeOAuthStore(getPrisma()), new GoogleOAuthHttpAdapter(clientId, clientSecret), betterAuthPasswordHasher, environment.AUTH_SECRET, environment.APP_URL);
  return oauthService;
}

export function getRuntimeChallengeService() {
  const environment = readAuthEnvironment();
  const store = new PrismaRuntimeAuthStore(getPrisma());
  const endpoint = process.env.AUTHFLOW_DELIVERY_WEBHOOK_URL;
  const token = process.env.AUTHFLOW_DELIVERY_WEBHOOK_SECRET;
  if (endpoint && process.env.NODE_ENV === "production" && !endpoint.startsWith("https://")) {
    throw new Error("AUTHFLOW_DELIVERY_WEBHOOK_URL must use HTTPS in production.");
  }
  const delivery = endpoint && token ? new HttpDeliveryAdapter(endpoint, token) : new DisabledDeliveryAdapter();
  challengeService ??= new RuntimeChallengeService(store, betterAuthPasswordHasher, delivery, environment.AUTH_SECRET, environment.APP_URL);
  return challengeService;
}

export {
  RegistrationValidationError,
  RuntimeAccountExistsError,
  RuntimeAuthService,
  RuntimeInvalidCredentialsError,
  RuntimeProjectNotFoundError,
  RuntimeRateLimitedError,
  type RuntimeRequestContext,
  RuntimeUnsupportedConfigError,
  RuntimeVerificationRequiredError,
} from "./service";
export { validateRegistration } from "./validation";
export {
  RuntimeChallengeAttemptsExceededError,
  RuntimeChallengeExpiredError,
  RuntimeChallengeInvalidError,
  RuntimeChallengeService,
  RuntimeMethodUnavailableError,
} from "./challenge-service";
export { RuntimeDeliveryUnavailableError } from "./delivery";
export { RuntimeOAuthProviderError, RuntimeOAuthStateError, RuntimeOAuthUnavailableError } from "./oauth";
export type { PasswordHasher, RuntimeAuthStore, RuntimeSession, RuntimeUser } from "./contracts";
