import { getPrisma } from "../src/lib/db/prisma";
import { countDeliveryEvents, deliveryHealth, readDeliveryMonitorSettings } from "../src/lib/monitoring/delivery-health";

async function main() {
  const { windowMinutes, threshold } = readDeliveryMonitorSettings(process.env);
  const prisma = getPrisma();
  try {
    const since = new Date(Date.now() - windowMinutes * 60_000);
    const result = deliveryHealth(await countDeliveryEvents(prisma, since), threshold);
    console.log(JSON.stringify({ event: "auth_delivery_health", windowMinutes, ...result }));
    if (result.status === "alert") process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error(JSON.stringify({ event: "auth_delivery_health", status: "error" }));
  process.exitCode = 1;
});
