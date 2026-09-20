import { notFound } from "next/navigation";

import { RuntimeAuthExperience } from "@/components/runtime-auth/runtime-auth-experience";
import { getRuntimeAuthService, RuntimeProjectNotFoundError } from "@/modules/runtime-auth";

export const dynamic = "force-dynamic";

async function loadProject(projectId: string) {
  try {
    return await getRuntimeAuthService().getProject(projectId);
  } catch (error) {
    if (error instanceof RuntimeProjectNotFoundError) notFound();
    throw error;
  }
}

export default async function RuntimeAuthPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await loadProject(projectId);
  return <RuntimeAuthExperience projectId={project.id} config={project.config} />;
}
