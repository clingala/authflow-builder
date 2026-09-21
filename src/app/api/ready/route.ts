import { NextResponse } from "next/server";

import { getPrisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

type DatabaseProbe = () => Promise<unknown>;

export async function createReadinessResponse(probe: DatabaseProbe, now = new Date()) {
  try {
    await probe();
    return NextResponse.json(
      { status: "ready", service: "authflow-builder", timestamp: now.toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "not_ready", service: "authflow-builder", timestamp: now.toISOString() },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export function GET() {
  return createReadinessResponse(() => getPrisma().$queryRaw`SELECT 1`);
}
