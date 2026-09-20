import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ProjectDashboard } from "@/components/dashboard/project-dashboard";
import { getAuth } from "@/lib/auth/server";
import { getProjectService } from "@/modules/projects";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const projects = await getProjectService().list(session.user.id);

  return (
    <ProjectDashboard
      ownerName={session.user.name}
      initialProjects={projects.map((project) => ({
        id: project.id,
        name: project.name,
        accountType: project.accountType,
        currentVersion: project.currentVersion,
        updatedAt: project.updatedAt.toISOString(),
      }))}
    />
  );
}

