import { describe, expect, it } from "vitest";

import { readAuthEnvironment, readDatabaseEnvironment } from "./runtime";

describe("runtime environment", () => {
  it("accepts an explicit PostgreSQL URL", () => {
    expect(readDatabaseEnvironment({ DATABASE_URL: "postgresql://owner:secret@localhost:5432/authflow" })).toEqual({
      DATABASE_URL: "postgresql://owner:secret@localhost:5432/authflow",
    });
  });

  it("fails closed when the auth secret is too short", () => {
    expect(() =>
      readAuthEnvironment({
        DATABASE_URL: "postgresql://owner:secret@localhost:5432/authflow",
        APP_URL: "http://localhost:3000",
        AUTH_SECRET: "short",
      }),
    ).toThrow(/AUTH_SECRET/);
  });
});

