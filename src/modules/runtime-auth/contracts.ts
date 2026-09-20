import type { AuthFlowConfig } from "@/modules/auth-config";
import type { JsonValue } from "@/modules/projects";

export type RuntimeProject = { id: string; config: AuthFlowConfig };
export type RuntimeUser = {
  id: string;
  projectId: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  profile: JsonValue;
};
export type RuntimeSession = {
  id: string;
  projectId: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  user: Pick<RuntimeUser, "id" | "email" | "emailVerified" | "phoneVerified" | "profile">;
};

export type RuntimeAuthEventInput = {
  projectId: string;
  runtimeUserId?: string;
  eventType: "runtime.signup" | "runtime.signin" | "runtime.signout";
  outcome: "success" | "failure" | "blocked";
  ipHash?: string;
  metadata?: JsonValue;
};

export interface RuntimeAuthStore {
  getProject(projectId: string): Promise<RuntimeProject | null>;
  findUserByEmail(projectId: string, email: string): Promise<RuntimeUser | null>;
  createUser(input: {
    projectId: string;
    email: string;
    passwordHash: string;
    profile: JsonValue;
  }): Promise<RuntimeUser | null>;
  createSession(input: {
    projectId: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ipHash?: string;
    userAgent?: string;
  }): Promise<RuntimeSession>;
  findSession(projectId: string, tokenHash: string, now: Date): Promise<RuntimeSession | null>;
  revokeSession(projectId: string, tokenHash: string): Promise<boolean>;
  markLogin(userId: string, at: Date): Promise<void>;
  recordEvent(input: RuntimeAuthEventInput): Promise<void>;
  consumeRateLimit(input: {
    keyHash: string;
    projectId: string;
    action: string;
    limit: number;
    windowSeconds: number;
    now: Date;
  }): Promise<{ allowed: boolean; retryAfterSeconds: number }>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(input: { hash: string; password: string }): Promise<boolean>;
}
