import { cleanupExpiredAuthData } from "../src/lib/db/cleanup";
import { getPrisma } from "../src/lib/db/prisma";

const prisma = getPrisma();

async function main() {
  const result = await cleanupExpiredAuthData(prisma);
  console.log(JSON.stringify({ event: "auth_retention_cleanup", result }));
}

main()
  .catch((error) => {
    console.error("Auth retention cleanup failed", error instanceof Error ? error.message : "Unknown error");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
