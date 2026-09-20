import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

import { getAuth } from "@/lib/auth/server";
import { ProjectNotFoundError, ProjectRevisionConflictError } from "@/modules/projects";

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

export function requireSameOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();

  if (!origin || !host) throw new ForbiddenError();

  try {
    const originUrl = new URL(origin);
    const expectedProtocol = forwardedProtocol ? `${forwardedProtocol}:` : request.nextUrl.protocol;
    if (originUrl.host.toLowerCase() !== host.toLowerCase() || originUrl.protocol !== expectedProtocol) {
      throw new ForbiddenError();
    }
  } catch (error) {
    if (error instanceof ForbiddenError) throw error;
    throw new ForbiddenError();
  }
}

export async function requireOwnerId(request: NextRequest): Promise<string> {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user.id) throw new UnauthorizedError();
  return session.user.id;
}

export function dataResponse<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data, error: null }, init);
}

export function errorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHENTICATED", message: "Authentication is required" } },
      { status: 401 },
    );
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { data: null, error: { code: "FORBIDDEN", message: "The request origin is not allowed" } },
      { status: 403 },
    );
  }
  if (error instanceof ProjectNotFoundError) {
    return NextResponse.json(
      { data: null, error: { code: "NOT_FOUND", message: "Project not found" } },
      { status: 404 },
    );
  }
  if (error instanceof ProjectRevisionConflictError) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "REVISION_CONFLICT",
          message: "The configuration was changed by another request",
          currentVersion: error.currentVersion,
        },
      },
      { status: 409 },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_FAILED",
          message: "The request is invalid",
          issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
        },
      },
      { status: 400 },
    );
  }

  console.error("Unhandled API error", error);
  return NextResponse.json(
    { data: null, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
    { status: 500 },
  );
}
