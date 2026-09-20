import { describe, expect, it } from "vitest";

import { parseAuthFlowConfig } from "./migrate";
import { authFlowTemplateIds, authFlowTemplates, getAuthFlowTemplate } from "./templates";

describe("AuthFlow templates", () => {
  it("provides every promised MVP starting template", () => {
    expect(authFlowTemplates.map((template) => template.id)).toEqual(authFlowTemplateIds);
  });

  it.each(authFlowTemplateIds)("produces a valid %s configuration", (templateId) => {
    const config = getAuthFlowTemplate(templateId, "Example Application");
    expect(parseAuthFlowConfig(config)).toEqual(config);
  });

  it("returns independent configurations", () => {
    const first = getAuthFlowTemplate("customer_portal", "One");
    first.labels.loginAction = "Continue";
    const second = getAuthFlowTemplate("customer_portal", "Two");
    expect(second.labels.loginAction).toBe("Sign In");
  });
});
