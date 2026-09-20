import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { getPrisma } from "@/lib/db/prisma";
import { readAuthEnvironment } from "@/lib/env/runtime";

export function createAuth() {
  const environment = readAuthEnvironment();

  return betterAuth({
    appName: "AuthFlow Builder",
    baseURL: environment.APP_URL,
    secret: environment.AUTH_SECRET,
    database: prismaAdapter(getPrisma(), { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      autoSignIn: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      freshAge: 60 * 10,
    },
    advanced: {
      database: {
        generateId: "uuid",
        joins: true,
      },
      useSecureCookies: process.env.NODE_ENV === "production",
    },
    trustedOrigins: [environment.APP_URL],
  });
}

export type Auth = ReturnType<typeof createAuth>;

let authInstance: Auth | undefined;

export function getAuth(): Auth {
  authInstance ??= createAuth();
  return authInstance;
}

