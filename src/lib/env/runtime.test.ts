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

  it("requires HTTPS for the production application origin", () => {
    expect(() => readAuthEnvironment({
      DATABASE_URL: "postgresql://owner:secret@localhost:5432/authflow",
      AUTH_SECRET: "a-secure-development-secret-with-32-characters",
      APP_URL: "http://auth.example.test",
      NODE_ENV: "production",
    })).toThrow(/HTTPS in production/);
  });

  it("rejects non-web application URL schemes", () => {
    expect(() => readAuthEnvironment({
      DATABASE_URL: "postgresql://owner:secret@localhost:5432/authflow",
      AUTH_SECRET: "a-secure-development-secret-with-32-characters",
      APP_URL: "ftp://auth.example.test",
    })).toThrow(/HTTP or HTTPS/);
  });
});
