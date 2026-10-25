import { notFound } from "next/navigation";
import { ScopeCheck } from "@/components/scope-check";
import { fmtIsoDate, fmtTs } from "@/lib/constants";
import { modelLabel, provider } from "@/lib/llm";
import { getLatestResults, getProject, getProjectDocs, requireUser } from "@/lib/queries";

export const metadata = { title: "Scope check · Dripi" };

export default async function CheckPage(props: PageProps<"/projects/[id]/check">) {
  const user = await requireUser();
  const { id } = await props.params;
  const project = await getProject(user.id, id);
  if (!project) notFound();
  const [{ sow, docs }, results] = await Promise.all([getProjectDocs(id), getLatestResults(id)]);
  return (
    <ScopeCheck
      project={{
        id: project.id, code: project.code, name: project.name,
        signoff: fmtIsoDate(project.signoffDate), created: fmtTs(project.createdAt), lastChecked: fmtTs(project.lastCheckedAt),
        hasResults: !!results,
      }}
      sow={sow}
      docs={docs}
      mode={{ provider: provider(), model: modelLabel() }}
    />
  );
}
