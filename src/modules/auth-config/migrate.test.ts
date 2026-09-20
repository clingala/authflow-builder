import { describe, expect, it } from "vitest";

import { createDefaultAuthFlowConfig } from "./defaults";
import { migrateAuthFlowConfig, UnsupportedAuthFlowVersionError } from "./migrate";

describe("AuthFlow schema migrations", () => {
  it("normalizes the current version", () => {
    const config = createDefaultAuthFlowConfig({ appName: "Example", accountType: "Member" });
    expect(migrateAuthFlowConfig(config)).toEqual(config);
  });

  it("fails explicitly for missing and future versions", () => {
    expect(() => migrateAuthFlowConfig({ app: {} })).toThrow(UnsupportedAuthFlowVersionError);
    expect(() => migrateAuthFlowConfig({ schemaVersion: 2 })).toThrow(UnsupportedAuthFlowVersionError);
  });
});

