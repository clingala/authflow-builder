import { z } from "zod";

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
});

const authEnvSchema = databaseEnvSchema.extend({
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must contain at least 32 characters"),
  APP_URL: z.string().url(),
});

export type DatabaseEnvironment = z.infer<typeof databaseEnvSchema>;
export type AuthEnvironment = z.infer<typeof authEnvSchema>;

type EnvironmentSource = Record<string, string | undefined>;

export function readDatabaseEnvironment(environment: EnvironmentSource = process.env): DatabaseEnvironment {
  return databaseEnvSchema.parse(environment);
}

export function readAuthEnvironment(environment: EnvironmentSource = process.env): AuthEnvironment {
  return authEnvSchema.parse(environment);
}
