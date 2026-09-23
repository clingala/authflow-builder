import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 5173);
const files = new Map([
  ["/", "index.html"],
  ["/auth/callback", "index.html"],
  ["/app.js", "app.js"],
  ["/config.js", "config.js"],
  ["/pkce.js", "pkce.js"],
  ["/styles.css", "styles.css"],
]);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

function safeConnectOrigin(rawIssuer) {
  try {
    const issuer = new URL(rawIssuer);
    const isLocalHttp = issuer.protocol === "http:" && ["localhost", "127.0.0.1"].includes(issuer.hostname);
    return isLocalHttp || issuer.protocol === "https:" ? issuer.origin : undefined;
  } catch {
    return undefined;
  }
}

function readCookie(request, name) {
  const prefix = `${name}=`;
  return (request.headers.cookie || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix))?.slice(prefix.length);
}

function serializeOriginCookie(name, origin) {
  return `${name}=${encodeURIComponent(origin)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`;
}

function cookieOrigin(request, name) {
  const value = readCookie(request, name);
  if (!value) return undefined;
  try {
    return safeConnectOrigin(decodeURIComponent(value));
  } catch {
    return undefined;
  }
}

createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    const pathname = requestUrl.pathname;
    const filename = files.get(pathname);
    if (!filename) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    const body = await readFile(join(root, filename));
    const requestedIssuer = safeConnectOrigin(requestUrl.searchParams.get("issuer"));
    const requestedTransportOrigin = safeConnectOrigin(requestUrl.searchParams.get("transport_origin"));
    const cookieIssuer = cookieOrigin(request, "authflow_pkce_issuer");
    const cookieTransportOrigin = cookieOrigin(request, "authflow_pkce_transport_origin");
    const connectOrigin = requestedTransportOrigin || cookieTransportOrigin || requestedIssuer || cookieIssuer || "http://localhost:4444";
    const headers = {
      "Content-Type": types[extname(filename)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "Content-Security-Policy": `default-src 'self'; connect-src ${connectOrigin} http://127.0.0.1:4444; style-src 'self'; script-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    };
    if (requestedIssuer) {
      headers["Set-Cookie"] = [
        serializeOriginCookie("authflow_pkce_issuer", requestedIssuer),
        serializeOriginCookie("authflow_pkce_transport_origin", requestedTransportOrigin || requestedIssuer),
      ];
    }
    response.writeHead(200, {
      ...headers,
    });
    response.end(body);
  } catch (error) {
    console.error(error);
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Internal server error");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`AuthFlow PKCE test client: http://localhost:${port}`);
});
