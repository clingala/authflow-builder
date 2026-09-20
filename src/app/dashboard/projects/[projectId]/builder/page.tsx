import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { getAuth } from "@/lib/auth/server";
import { parseAuthFlowConfig } from "@/modules/auth-config";
import { AuthFlowBuilder } from "@/modules/builder";
import { getProjectService, ProjectNotFoundError } from "@/modules/projects";

export const dynamic = "force-dynamic";

async function loadOwnedProject(ownerId: string, projectId: string) {
  try {
    return await getProjectService().get(ownerId, projectId);
  } catch (error) {
    if (error instanceof ProjectNotFoundError) notFound();
    throw error;
  }
}

export default async function BuilderPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const { projectId } = await params;
  const project = await loadOwnedProject(session.user.id, projectId);
  return <AuthFlowBuilder project={{ id: project.id, version: project.currentVersion, config: parseAuthFlowConfig(project.config) }} />;
}
