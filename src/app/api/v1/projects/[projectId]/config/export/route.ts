import type { NextRequest } from "next/server";
import { z } from "zod";

import { errorResponse, requireOwnerId } from "@/app/api/v1/_shared";
import { buildConfigExport, buildNextJsExport, exportTargets } from "@/modules/export";
import { getProjectService } from "@/modules/projects";

type Context = { params: Promise<{ projectId: string }> };
const exportTargetSchema = z.enum(exportTargets);

function attachment(body: unknown, filename: string, projectVersion: number): Response {
  return new Response(`${JSON.stringify(body, null, 2)}\n`, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "application/json; charset=utf-8",
      "ETag": `\"authflow-v${projectVersion}\"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const [ownerId, { projectId }] = await Promise.all([requireOwnerId(request), context.params]);
    const project = await getProjectService().get(ownerId, projectId);
    const target = exportTargetSchema.parse(request.nextUrl.searchParams.get("target") ?? "config");

    if (target === "nextjs") {
      return attachment(
        buildNextJsExport({ projectId: project.id, projectVersion: project.currentVersion, config: project.config }),
        `${project.slug}-nextjs.json`,
        project.currentVersion,
      );
    }

    return attachment(buildConfigExport(project.config), `${project.slug}-authflow.json`, project.currentVersion);
  } catch (error) {
    return errorResponse(error);
  }
}
