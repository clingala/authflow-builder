import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { ApplicationClientNotFoundError, ApplicationClientOriginError, getApplicationClientService } from "@/modules/application-clients";

type Context = { params: Promise<{ clientId: string }> };

function corsHeaders(origin: string | null) {
  return {
    "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    "Vary": "Origin",
    ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
  };
}

export async function GET(request: NextRequest, context: Context) {
  const origin = request.headers.get("origin");
  try {
    const { clientId } = await context.params;
    const data = await getApplicationClientService().getPublic(clientId, origin, request.nextUrl.origin);
    return NextResponse.json({ data, error: null }, { headers: corsHeaders(origin) });
  } catch (error) {
    if (error instanceof ApplicationClientOriginError) return NextResponse.json({ data: null, error: { code: "ORIGIN_NOT_ALLOWED", message: "This origin is not registered for the application client" } }, { status: 403, headers: { "Cache-Control": "no-store", "Vary": "Origin" } });
    if (error instanceof ApplicationClientNotFoundError || error instanceof ZodError) return NextResponse.json({ data: null, error: { code: "NOT_FOUND", message: "Application client not found" } }, { status: 404, headers: { "Cache-Control": "no-store" } });
    console.error("Public client configuration error", error);
    return NextResponse.json({ data: null, error: { code: "INTERNAL_ERROR", message: "Configuration could not be loaded" } }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function OPTIONS(request: NextRequest, context: Context) {
  const origin = request.headers.get("origin");
  try {
    const { clientId } = await context.params;
    await getApplicationClientService().getPublic(clientId, origin, request.nextUrl.origin);
    return new Response(null, { status: 204, headers: { ...corsHeaders(origin), "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" } });
  } catch {
    return new Response(null, { status: 403, headers: { "Cache-Control": "no-store", "Vary": "Origin" } });
  }
}
