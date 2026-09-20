import { Prisma, type PrismaClient } from "@/generated/prisma/client";

import { parseAuthFlowConfig } from "@/modules/auth-config";
import type { JsonValue } from "@/modules/projects";

import type { RuntimeAuthEventInput, RuntimeAuthStore, RuntimeChallenge, RuntimeSession, RuntimeUser } from "./contracts";

function jsonValue(value: Prisma.JsonValue): JsonValue {
  return value as JsonValue;
}

function mapUser(user: {
  id: string;
  projectId: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  profile: Prisma.JsonValue;
}): RuntimeUser {
  return { ...user, profile: jsonValue(user.profile) };
}

function mapSession(session: {
  id: string;
  projectId: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    profile: Prisma.JsonValue;
  };
}): RuntimeSession {
  return { ...session, user: { ...session.user, profile: jsonValue(session.user.profile) } };
}

export class PrismaRuntimeAuthStore implements RuntimeAuthStore {
  constructor(private readonly prisma: PrismaClient) {}

  async getProject(projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, status: "ACTIVE" },
      include: { activeConfig: true },
    });
    if (!project?.activeConfig) return null;
    return { id: project.id, config: parseAuthFlowConfig(project.activeConfig.config) };
  }

  async findUserByEmail(projectId: string, email: string) {
    const user = await this.prisma.runtimeUser.findUnique({ where: { projectId_email: { projectId, email } } });
    return user ? mapUser(user) : null;
  }

  async findUserByPhone(projectId: string, phone: string) {
    const user = await this.prisma.runtimeUser.findFirst({ where: { projectId, profile: { path: ["phone"], equals: phone } } });
    return user ? mapUser(user) : null;
  }

  async createUser(input: { projectId: string; email: string; passwordHash: string; profile: JsonValue }) {
    try {
      const user = await this.prisma.runtimeUser.create({
        data: { ...input, profile: input.profile as Prisma.InputJsonValue },
      });
      return mapUser(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return null;
      throw error;
    }
  }

  async createSession(input: { projectId: string; userId: string; tokenHash: string; expiresAt: Date; ipHash?: string; userAgent?: string }) {
    const session = await this.prisma.runtimeSession.create({
      data: input,
      include: { user: true },
    });
    return mapSession(session);
  }

  async findSession(projectId: string, tokenHash: string, now: Date) {
    const session = await this.prisma.runtimeSession.findFirst({
      where: { projectId, tokenHash, revokedAt: null, expiresAt: { gt: now } },
      include: { user: true },
    });
    return session ? mapSession(session) : null;
  }

  async revokeSession(projectId: string, tokenHash: string) {
    const result = await this.prisma.runtimeSession.updateMany({
      where: { projectId, tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count > 0;
  }

  async markLogin(userId: string, at: Date) {
    await this.prisma.runtimeUser.update({ where: { id: userId }, data: { lastLoginAt: at } });
  }

  async createChallenge(input: { projectId: string; runtimeUserId: string; purpose: "verify_email" | "verify_phone" | "recover_password"; channel: "email_link" | "email_otp" | "phone_otp"; targetHash: string; secretHash: string; expiresAt: Date; nextResendAt: Date }) {
    return this.prisma.runtimeChallenge.create({ data: input }) as Promise<RuntimeChallenge>;
  }

  async invalidateActiveChallenges(input: { projectId: string; runtimeUserId: string; purpose: "verify_email" | "verify_phone" | "recover_password"; now: Date }) {
    await this.prisma.runtimeChallenge.updateMany({ where: { projectId: input.projectId, runtimeUserId: input.runtimeUserId, purpose: input.purpose, consumedAt: null }, data: { consumedAt: input.now } });
  }

  async findActiveChallenge(input: { projectId: string; purpose: "verify_email" | "verify_phone" | "recover_password"; targetHash: string; now: Date }) {
    return this.prisma.runtimeChallenge.findFirst({
      where: { projectId: input.projectId, purpose: input.purpose, targetHash: input.targetHash, consumedAt: null, expiresAt: { gt: input.now } },
      orderBy: { createdAt: "desc" },
    }) as Promise<RuntimeChallenge | null>;
  }

  async incrementChallengeAttempt(id: string) {
    await this.prisma.runtimeChallenge.update({ where: { id }, data: { attempts: { increment: 1 } } });
  }

  async consumeChallenge(id: string, now: Date) {
    const result = await this.prisma.runtimeChallenge.updateMany({ where: { id, consumedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now } });
    return result.count === 1;
  }

  async setVerified(userId: string, channel: "email" | "phone") {
    await this.prisma.runtimeUser.update({ where: { id: userId }, data: channel === "email" ? { emailVerified: true } : { phoneVerified: true } });
  }

  async updatePasswordAndRevokeSessions(userId: string, passwordHash: string, at: Date) {
    await this.prisma.$transaction([
      this.prisma.runtimeUser.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.runtimeSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: at } }),
    ]);
  }

  async recordEvent(input: RuntimeAuthEventInput) {
    await this.prisma.runtimeAuthEvent.create({
      data: {
        projectId: input.projectId,
        runtimeUserId: input.runtimeUserId,
        eventType: input.eventType,
        outcome: input.outcome,
        ipHash: input.ipHash,
        ...(input.metadata ? { metadata: input.metadata as Prisma.InputJsonValue } : {}),
      },
    });
  }

  async consumeRateLimit(input: { keyHash: string; projectId: string; action: string; limit: number; windowSeconds: number; now: Date }) {
    const expiresAt = new Date(input.now.getTime() + input.windowSeconds * 1000);
    const rows = await this.prisma.$queryRaw<Array<{ count: number; expiresAt: Date }>>(Prisma.sql`
      INSERT INTO "runtime_rate_limits" ("keyHash", "projectId", "action", "count", "windowStartedAt", "expiresAt", "updatedAt")
      VALUES (${input.keyHash}, ${input.projectId}::uuid, ${input.action}, 1, ${input.now}, ${expiresAt}, ${input.now})
      ON CONFLICT ("keyHash") DO UPDATE SET
        "count" = CASE WHEN "runtime_rate_limits"."expiresAt" <= ${input.now} THEN 1 ELSE "runtime_rate_limits"."count" + 1 END,
        "windowStartedAt" = CASE WHEN "runtime_rate_limits"."expiresAt" <= ${input.now} THEN ${input.now} ELSE "runtime_rate_limits"."windowStartedAt" END,
        "expiresAt" = CASE WHEN "runtime_rate_limits"."expiresAt" <= ${input.now} THEN ${expiresAt} ELSE "runtime_rate_limits"."expiresAt" END,
        "updatedAt" = ${input.now}
      RETURNING "count", "expiresAt"
    `);
    const bucket = rows[0]!;
    return {
      allowed: bucket.count <= input.limit,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.expiresAt.getTime() - input.now.getTime()) / 1000)),
    };
  }
}
