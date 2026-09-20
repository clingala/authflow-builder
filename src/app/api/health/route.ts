import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function createHealthPayload(now = new Date()) {
  return {
    status: "ok" as const,
    service: "authflow-builder",
    timestamp: now.toISOString(),
  };
}

export function GET() {
  return NextResponse.json(createHealthPayload(), {
    headers: { "Cache-Control": "no-store" },
  });
}

