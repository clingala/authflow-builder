import { describe, expect, it } from "vitest";

import { createDefaultAuthFlowConfig, parseAuthFlowConfig } from "@/modules/auth-config";

import { buildConfigExport, buildNextJsExport } from "./service";

describe("export service", () => {
  it("round-trips a normalized configuration through the public JSON export", () => {
    const config = createDefaultAuthFlowConfig({ appName: "Applicant Hub", accountType: "Applicant" });
    const exported = buildConfigExport(JSON.parse(JSON.stringify(config)));

    expect(parseAuthFlowConfig(JSON.parse(JSON.stringify(exported)))).toEqual(config);
  });

  it("refuses to export an invalid configuration", () => {
    expect(() => buildConfigExport({ schemaVersion: 1, app: { name: "Broken" } })).toThrow();
  });

  it("generates a deterministic Next.js hosted-auth starter without secrets", () => {
    const bundle = buildNextJsExport({
      projectId: "891e05e7-26b1-42ef-8f7c-2c7722125342",
      projectVersion: 7,
      config: createDefaultAuthFlowConfig({ appName: "Member Space", accountType: "Member" }),
      generatedAt: new Date("2026-09-21T12:00:00.000Z"),
    });

    expect(bundle).toMatchObject({
      format: "authflow.nextjs.bundle",
      formatVersion: 1,
      projectVersion: 7,
      generatedAt: "2026-09-21T12:00:00.000Z",
    });
    expect(bundle.files.map((file) => file.path)).toEqual([
      "authflow.config.json",
      "app/account/page.tsx",
      ".env.example",
      "README.md",
    ]);
    expect(bundle.files.find((file) => file.path === "app/account/page.tsx")?.content).toContain("redirect(");
    expect(JSON.stringify(bundle)).not.toMatch(/client[_-]?secret|private[_-]?key|password\s*[:=]/i);
  });
});
