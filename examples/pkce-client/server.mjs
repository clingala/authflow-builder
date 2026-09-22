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

createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`).pathname;
    const filename = files.get(pathname);
    if (!filename) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    const body = await readFile(join(root, filename));
    response.writeHead(200, {
      "Content-Type": types[extname(filename)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'self'; connect-src http://localhost:4444 http://127.0.0.1:4444; style-src 'self'; script-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
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
