const productionScriptSource = "script-src 'self' 'unsafe-inline'";
const developmentScriptSource = `${productionScriptSource} 'unsafe-eval'`;

export function createSecurityHeaders(environment: "development" | "test" | "production" | undefined) {
  const development = environment === "development";
  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    development ? developmentScriptSource : productionScriptSource,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    development ? null : "upgrade-insecure-requests",
  ].filter((directive): directive is string => directive !== null).join("; ");

  return [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  ] satisfies Array<{ key: string; value: string }>;
}

export const securityHeaders = createSecurityHeaders("production");
