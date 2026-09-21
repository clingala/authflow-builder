import { parseAuthFlowConfig, type AuthFlowConfig } from "@/modules/auth-config";

import type { ConfigExport, NextJsExportBundle } from "./contracts";

function serialize(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function componentSource(projectId: string): string {
  return `import { redirect } from "next/navigation";

const projectId = ${JSON.stringify(projectId)};

export default function AccountPage() {
  const authFlowHost = process.env.AUTHFLOW_HOST_URL;
  if (!authFlowHost) throw new Error("AUTHFLOW_HOST_URL is required");

  redirect(new URL(\`/auth/\${projectId}\`, authFlowHost).toString());
}
`;
}

function readmeSource(config: AuthFlowConfig): string {
  return `# ${config.app.name} AuthFlow integration

This starter connects a Next.js application to the hosted AuthFlow experience for the configured ${config.app.accountType.toLowerCase()} account.

1. Copy \`app/account/page.tsx\` into the consuming Next.js application.
2. Set \`AUTHFLOW_HOST_URL\` to the public HTTPS origin of the AuthFlow deployment.
3. Keep \`authflow.config.json\` in source control only if its branding and form configuration are intended to be public.
4. Configure provider credentials and delivery adapters in AuthFlow server secret storage, never in this bundle.

The generated page redirects to the project-scoped hosted authentication runtime. It does not implement passwords, OAuth, OTP, or sessions in the consuming application.
`;
}

export function buildConfigExport(rawConfig: unknown): ConfigExport {
  return parseAuthFlowConfig(rawConfig);
}

export function buildNextJsExport(input: {
  projectId: string;
  projectVersion: number;
  config: unknown;
  generatedAt?: Date;
}): NextJsExportBundle {
  const config = buildConfigExport(input.config);
  return {
    format: "authflow.nextjs.bundle",
    formatVersion: 1,
    projectId: input.projectId,
    projectVersion: input.projectVersion,
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    files: [
      { path: "authflow.config.json", contentType: "application/json", content: serialize(config) },
      { path: "app/account/page.tsx", contentType: "text/typescript", content: componentSource(input.projectId) },
      { path: ".env.example", contentType: "text/plain", content: "AUTHFLOW_HOST_URL=https://auth.example.com\n" },
      { path: "README.md", contentType: "text/markdown", content: readmeSource(config) },
    ],
  };
}
