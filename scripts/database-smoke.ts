import { randomUUID } from "node:crypto";

import { createDefaultAuthFlowConfig } from "../src/modules/auth-config";
import { getPrisma } from "../src/lib/db/prisma";
import { PrismaProjectStore } from "../src/modules/projects/prisma-project-store";
import { ProjectNotFoundError, ProjectService } from "../src/modules/projects/service";
import { betterAuthPasswordHasher } from "../src/modules/runtime-auth/password";
import { PrismaRuntimeAuthStore } from "../src/modules/runtime-auth/prisma-runtime-auth-store";
import { RuntimeAuthService } from "../src/modules/runtime-auth/service";

async function cleanupOwners(ownerIds: string[]) {
  if (ownerIds.length === 0) return;
  const prisma = getPrisma();
  await prisma.auditEvent.deleteMany({ where: { actorId: { in: ownerIds } } });
  await prisma.project.deleteMany({ where: { ownerId: { in: ownerIds } } });
  await prisma.user.deleteMany({ where: { id: { in: ownerIds } } });
}

async function main() {
  const prisma = getPrisma();
  const suffix = randomUUID();
  const ownerIds: string[] = [];

  try {
    const staleSmokeOwners = await prisma.user.findMany({
      where: { email: { startsWith: "smoke-", endsWith: "@example.test" } },
      select: { id: true },
    });
    await cleanupOwners(staleSmokeOwners.map((owner) => owner.id));

    const owners = await Promise.all([
      prisma.user.create({ data: { name: "Smoke Owner A", email: `smoke-a-${suffix}@example.test` } }),
      prisma.user.create({ data: { name: "Smoke Owner B", email: `smoke-b-${suffix}@example.test` } }),
    ]);
    ownerIds.push(...owners.map((owner) => owner.id));

    const service = new ProjectService(new PrismaProjectStore(prisma));
    const project = await service.create(owners[0]!.id, {
      name: "Database Smoke Test",
      accountType: "Customer",
    });
    const secondProject = await service.create(owners[1]!.id, {
      name: "Second Runtime Tenant",
      accountType: "Member",
    });
    const persisted = await service.get(owners[0]!.id, project.id);

    let crossOwnerDenied = false;
    try {
      await service.get(owners[1]!.id, project.id);
    } catch (error) {
      crossOwnerDenied = error instanceof ProjectNotFoundError;
    }
    if (!crossOwnerDenied) throw new Error("Cross-owner access was not denied");

    const updatedConfig = createDefaultAuthFlowConfig({ appName: "Database Smoke Test", accountType: "Customer" });
    updatedConfig.labels.loginAction = "Continue";
    const saved = await service.saveConfig(owners[0]!.id, project.id, {
      expectedVersion: 1,
      config: updatedConfig,
    });
    const auditCount = await prisma.auditEvent.count({ where: { projectId: project.id } });

    if (persisted.currentVersion !== 1 || saved.currentVersion !== 2 || auditCount !== 2) {
      throw new Error("Persistence or audit assertions failed");
    }

    const runtime = new RuntimeAuthService(
      new PrismaRuntimeAuthStore(prisma),
      betterAuthPasswordHasher,
      "database-smoke-secret-at-least-32-characters",
    );
    const runtimeEmail = `runtime-${suffix}@example.test`;
    const runtimePassword = "SmokePassword9";
    const runtimeInput = {
      fields: {
        full_name: "Runtime Smoke User",
        email: runtimeEmail,
        password: runtimePassword,
        confirm_password: runtimePassword,
      },
    };
    const firstRuntime = await runtime.signUp(project.id, runtimeInput, { ipHash: "smoke-ip-a" });
    const secondRuntime = await runtime.signUp(secondProject.id, runtimeInput, { ipHash: "smoke-ip-b" });
    const storedRuntimeUsers = await prisma.runtimeUser.findMany({ where: { email: runtimeEmail } });
    const storedRuntimeSessions = await prisma.runtimeSession.findMany({ where: { userId: { in: storedRuntimeUsers.map((user) => user.id) } } });
    const runtimeIsolation = storedRuntimeUsers.length === 2
      && storedRuntimeUsers.every((user) => user.passwordHash !== runtimePassword)
      && storedRuntimeSessions.every((session) => session.tokenHash !== firstRuntime.session?.token && session.tokenHash !== secondRuntime.session?.token)
      && await runtime.getSession(secondProject.id, firstRuntime.session?.token) === null;
    if (!runtimeIsolation) throw new Error("Runtime tenant or secret-storage assertions failed");

    console.log(
      JSON.stringify({
        persisted: true,
        initialVersion: persisted.currentVersion,
        savedVersion: saved.currentVersion,
        auditCount,
        crossOwnerDenied,
        runtimeIsolation,
      }),
    );
  } finally {
    await cleanupOwners(ownerIds);
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
