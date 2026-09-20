import { randomUUID } from "node:crypto";

import { getPrisma } from "../src/lib/db/prisma";
import { PrismaProjectStore } from "../src/modules/projects/prisma-project-store";
import { ProjectNotFoundError, ProjectService } from "../src/modules/projects/service";

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
    const persisted = await service.get(owners[0]!.id, project.id);

    let crossOwnerDenied = false;
    try {
      await service.get(owners[1]!.id, project.id);
    } catch (error) {
      crossOwnerDenied = error instanceof ProjectNotFoundError;
    }
    if (!crossOwnerDenied) throw new Error("Cross-owner access was not denied");

    const saved = await service.saveConfig(owners[0]!.id, project.id, {
      expectedVersion: 1,
      config: {
        schemaVersion: 1,
        app: { name: "Database Smoke Test", accountType: "Customer" },
        labels: { login: "Sign In" },
      },
    });
    const auditCount = await prisma.auditEvent.count({ where: { projectId: project.id } });

    if (persisted.currentVersion !== 1 || saved.currentVersion !== 2 || auditCount !== 2) {
      throw new Error("Persistence or audit assertions failed");
    }

    console.log(
      JSON.stringify({
        persisted: true,
        initialVersion: persisted.currentVersion,
        savedVersion: saved.currentVersion,
        auditCount,
        crossOwnerDenied,
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
