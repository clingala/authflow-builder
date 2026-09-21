import { z } from "zod";

function isLocalhost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

const absoluteUrl = z.string().trim().max(500).transform((value, context) => {
  try {
    const url = new URL(value);
    if (url.username || url.password || (url.protocol !== "https:" && !(url.protocol === "http:" && isLocalhost(url.hostname)))) {
      throw new Error();
    }
    url.hash = "";
    return url.toString();
  } catch {
    context.addIssue({ code: "custom", message: "Use HTTPS, or HTTP only for localhost development" });
    return z.NEVER;
  }
});

const origin = absoluteUrl.transform((value, context) => {
  const url = new URL(value);
  if (url.pathname !== "/" || url.search) {
    context.addIssue({ code: "custom", message: "Origins cannot contain a path, query, or fragment" });
    return z.NEVER;
  }
  return url.origin;
});

export const createApplicationClientSchema = z.object({
  name: z.string().trim().min(1).max(80),
  redirectUris: z.array(absoluteUrl).min(1).max(20),
  allowedOrigins: z.array(origin).min(1).max(20),
}).strict().transform((input) => ({
  ...input,
  redirectUris: [...new Set(input.redirectUris)],
  allowedOrigins: [...new Set(input.allowedOrigins)],
}));

export const projectIdSchema = z.string().uuid();
export const applicationClientIdSchema = z.string().uuid();
export const publicClientIdSchema = z.string().regex(/^af_pk_[A-Za-z0-9_-]{32,64}$/);

export type CreateApplicationClientInput = z.input<typeof createApplicationClientSchema>;
