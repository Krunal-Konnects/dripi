import { ProjectsView } from "@/components/projects-view";
import { fmtIsoDate, fmtTs } from "@/lib/constants";
import { listProjects, requireUser } from "@/lib/queries";

export const metadata = { title: "Projects · Dripi" };

export default async function ProjectsPage() {
  const user = await requireUser();
  const rows = await listProjects(user.id);
  return (
    <ProjectsView
      projects={rows.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        created: fmtTs(p.createdAt),
        checked: fmtTs(p.lastCheckedAt),
        signoff: fmtIsoDate(p.signoffDate),
        stakeCount: p.stakeCount,
        sowName: p.sowName,
        sowUpdated: fmtTs(p.sowUploadedAt),
      }))}
    />
  );
}
