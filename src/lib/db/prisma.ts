import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { readDatabaseEnvironment } from "@/lib/env/runtime";

const globalForPrisma = globalThis as unknown as { authFlowPrisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (globalForPrisma.authFlowPrisma) {
    return globalForPrisma.authFlowPrisma;
  }

  const { DATABASE_URL } = readDatabaseEnvironment();
  const adapter = new PrismaPg({ connectionString: DATABASE_URL });
  const client = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.authFlowPrisma = client;
  }

  return client;
}

