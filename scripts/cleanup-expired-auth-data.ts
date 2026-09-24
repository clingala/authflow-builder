import { cleanupExpiredAuthData } from "../src/lib/db/cleanup";
import { getPrisma } from "../src/lib/db/prisma";

const prisma = getPrisma();

async function main() {
  const result = await cleanupExpiredAuthData(prisma);
  console.log(JSON.stringify({ event: "auth_retention_cleanup", result }));
}

main()
  .catch(() => {
    // Database errors can contain connection details. Keep cron logs aggregate-only.
    console.error(JSON.stringify({ event: "auth_retention_cleanup", status: "error" }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
