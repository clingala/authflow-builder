import { z } from "zod";

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
});

const authEnvSchema = databaseEnvSchema.extend({
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must contain at least 32 characters"),
  APP_URL: z.string().url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "APP_URL must use HTTP or HTTPS"),
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
}).superRefine((environment, context) => {
  if (environment.NODE_ENV === "production" && new URL(environment.APP_URL).protocol !== "https:") {
    context.addIssue({ code: "custom", message: "APP_URL must use HTTPS in production", path: ["APP_URL"] });
  }
});

const oauthPlatformEnvSchema = z.object({
  HYDRA_ADMIN_URL: z.string().url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol)),
  HYDRA_PUBLIC_URL: z.string().url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol)),
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
}).superRefine((environment, context) => {
  if (environment.NODE_ENV === "production" && new URL(environment.HYDRA_PUBLIC_URL).protocol !== "https:") {
    context.addIssue({ code: "custom", message: "HYDRA_PUBLIC_URL must use HTTPS in production", path: ["HYDRA_PUBLIC_URL"] });
  }
});

export type DatabaseEnvironment = z.infer<typeof databaseEnvSchema>;
export type AuthEnvironment = z.infer<typeof authEnvSchema>;
export type OAuthPlatformEnvironment = z.infer<typeof oauthPlatformEnvSchema>;

type EnvironmentSource = Record<string, string | undefined>;

export function readDatabaseEnvironment(environment: EnvironmentSource = process.env): DatabaseEnvironment {
  return databaseEnvSchema.parse(environment);
}

export function readAuthEnvironment(environment: EnvironmentSource = process.env): AuthEnvironment {
  return authEnvSchema.parse(environment);
}

export function readOAuthPlatformEnvironment(environment: EnvironmentSource = process.env): OAuthPlatformEnvironment {
  return oauthPlatformEnvSchema.parse(environment);
}
