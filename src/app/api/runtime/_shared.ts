import { createHmac } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

import { requireSameOrigin } from "@/app/api/v1/_shared";
import { readAuthEnvironment } from "@/lib/env/runtime";
import {
  RegistrationValidationError,
  RuntimeAccountExistsError,
  RuntimeInvalidCredentialsError,
  RuntimeProjectNotFoundError,
  RuntimeRateLimitedError,
  RuntimeUnsupportedConfigError,
  RuntimeVerificationRequiredError,
  type RuntimeRequestContext,
} from "@/modules/runtime-auth";

export function runtimeSessionCookieName(projectId: string) {
  return `authflow_runtime_${projectId.replaceAll("-", "")}`;
}

export function requestContext(request: NextRequest): RuntimeRequestContext {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwarded || realIp;
  const ipHash = ip ? createHmac("sha256", readAuthEnvironment().AUTH_SECRET).update(ip).digest("hex") : undefined;
  return { ipHash, userAgent: request.headers.get("user-agent")?.slice(0, 500) || undefined };
}

export function requireRuntimeWriteOrigin(request: NextRequest) {
  requireSameOrigin(request);
}

export function runtimeDataResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data, error: null }, { status });
}

export function setRuntimeSessionCookie(response: NextResponse, projectId: string, session: { token: string; expiresAt: Date }) {
  response.cookies.set(runtimeSessionCookieName(projectId), session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });
}

export function clearRuntimeSessionCookie(response: NextResponse, projectId: string) {
  response.cookies.set(runtimeSessionCookieName(projectId), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function runtimeErrorResponse(error: unknown) {
  if (error instanceof RuntimeProjectNotFoundError) return errorJson(404, "NOT_FOUND", "Authentication project not found");
  if (error instanceof RuntimeUnsupportedConfigError) return errorJson(409, "UNSUPPORTED_CONFIGURATION", "This project is not configured for email and password authentication");
  if (error instanceof RuntimeAccountExistsError) return errorJson(409, "ACCOUNT_EXISTS", "An account already exists with that email address");
  if (error instanceof RuntimeInvalidCredentialsError) return errorJson(401, "INVALID_CREDENTIALS", "The email or password is incorrect");
  if (error instanceof RuntimeVerificationRequiredError) return errorJson(403, "VERIFICATION_REQUIRED", "Account verification is required");
  if (error instanceof RuntimeRateLimitedError) {
    return NextResponse.json(
      { data: null, error: { code: "RATE_LIMITED", message: "Too many attempts. Try again later.", retryAfterSeconds: error.retryAfterSeconds } },
      { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
    );
  }
  if (error instanceof RegistrationValidationError) {
    return NextResponse.json({ data: null, error: { code: "VALIDATION_FAILED", message: "Check the highlighted fields", fields: error.issues } }, { status: 400 });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ data: null, error: { code: "VALIDATION_FAILED", message: "The request is invalid" } }, { status: 400 });
  }
  console.error("Unhandled runtime authentication error", error);
  return errorJson(500, "INTERNAL_ERROR", "The authentication request could not be completed");
}

function errorJson(status: number, code: string, message: string) {
  return NextResponse.json({ data: null, error: { code, message } }, { status });
}
