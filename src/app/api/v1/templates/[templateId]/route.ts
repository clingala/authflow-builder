import type { NextRequest } from "next/server";
import { z } from "zod";

import { dataResponse, errorResponse } from "@/app/api/v1/_shared";
import { authFlowTemplateIds, getAuthFlowTemplate } from "@/modules/auth-config";

const templateRequestSchema = z.object({
  templateId: z.enum(authFlowTemplateIds),
  appName: z.string().trim().min(1).max(100),
});

type RouteContext = { params: Promise<{ templateId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { templateId } = await context.params;
    const input = templateRequestSchema.parse({
      templateId,
      appName: request.nextUrl.searchParams.get("appName") ?? "My Application",
    });

    return dataResponse({
      templateId: input.templateId,
      config: getAuthFlowTemplate(input.templateId, input.appName),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
