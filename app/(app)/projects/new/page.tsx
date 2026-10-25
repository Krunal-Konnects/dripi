import { NewProjectForm } from "@/components/new-project-form";
import { requireUser } from "@/lib/queries";

export const metadata = { title: "New project · Dripi" };

export default async function NewProjectPage() {
  await requireUser();
  return <NewProjectForm />;
}
