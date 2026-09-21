import { cpSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";

const standaloneRoot = ".next/standalone";
if (!existsSync(`${standaloneRoot}/server.js`)) {
  throw new Error("Standalone output is missing. Run pnpm build first.");
}

cpSync(".next/static", `${standaloneRoot}/.next/static`, { recursive: true });

const server = spawn(process.execPath, [`${standaloneRoot}/server.js`], {
  env: process.env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}

server.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
