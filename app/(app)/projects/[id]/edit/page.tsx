import { notFound } from "next/navigation";
import { EditProjectForm } from "@/components/edit-project-form";
import { fmtTs } from "@/lib/constants";
import { getProject, getProjectDocs, getStakeholders, requireUser } from "@/lib/queries";

export const metadata = { title: "Edit project · Dripi" };

export default async function EditProjectPage(props: PageProps<"/projects/[id]/edit">) {
  const user = await requireUser();
  const { id } = await props.params;
  const project = await getProject(user.id, id);
  if (!project) notFound();
  const [{ sow }, people] = await Promise.all([getProjectDocs(id), getStakeholders(id)]);
  return (
    <EditProjectForm
      project={{ id: project.id, code: project.code, name: project.name, signoffDate: project.signoffDate }}
      sow={sow ? { fileName: sow.fileName, charCount: sow.charCount, updated: fmtTs(sow.uploadedAt) } : null}
      stakeholders={people.map((s) => ({ id: s.id, team: s.team, name: s.name, email: s.email }))}
    />
  );
}
