import { getPrisma } from "@/lib/db/prisma";
import { readAuthEnvironment } from "@/lib/env/runtime";

import { betterAuthPasswordHasher } from "./password";
import { PrismaRuntimeAuthStore } from "./prisma-runtime-auth-store";
import { RuntimeAuthService } from "./service";

let service: RuntimeAuthService | undefined;

export function getRuntimeAuthService() {
  service ??= new RuntimeAuthService(
    new PrismaRuntimeAuthStore(getPrisma()),
    betterAuthPasswordHasher,
    readAuthEnvironment().AUTH_SECRET,
  );
  return service;
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
export type { PasswordHasher, RuntimeAuthStore, RuntimeSession, RuntimeUser } from "./contracts";
