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
  eventType: "runtime.signup" | "runtime.signin" | "runtime.signout" | "runtime.verification" | "runtime.recovery";
  outcome: "success" | "failure" | "blocked";
  ipHash?: string;
  metadata?: JsonValue;
};

export type RuntimeChallenge = {
  id: string;
  projectId: string;
  runtimeUserId: string;
  purpose: "verify_email" | "verify_phone" | "recover_password";
  channel: "email_link" | "email_otp" | "phone_otp";
  targetHash: string;
  secretHash: string;
  attempts: number;
  resendCount: number;
  expiresAt: Date;
  nextResendAt: Date;
  consumedAt: Date | null;
};

export interface RuntimeAuthStore {
  getProject(projectId: string): Promise<RuntimeProject | null>;
  findUserByEmail(projectId: string, email: string): Promise<RuntimeUser | null>;
  findUserByPhone(projectId: string, phone: string): Promise<RuntimeUser | null>;
  findUserById(projectId: string, userId: string): Promise<RuntimeUser | null>;
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
  createChallenge(input: Omit<RuntimeChallenge, "id" | "attempts" | "resendCount" | "consumedAt">): Promise<RuntimeChallenge>;
  invalidateActiveChallenges(input: { projectId: string; runtimeUserId: string; purpose: RuntimeChallenge["purpose"]; now: Date }): Promise<void>;
  findActiveChallenge(input: { projectId: string; purpose: RuntimeChallenge["purpose"]; targetHash: string; now: Date }): Promise<RuntimeChallenge | null>;
  incrementChallengeAttempt(id: string): Promise<void>;
  consumeChallenge(id: string, now: Date): Promise<boolean>;
  setVerified(userId: string, channel: "email" | "phone"): Promise<void>;
  updatePasswordAndRevokeSessions(userId: string, passwordHash: string, at: Date): Promise<void>;
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
