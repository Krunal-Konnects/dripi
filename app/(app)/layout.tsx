import { AppShell } from "@/components/app-shell";
import { listProjects, openDecisionCount, requireUser } from "@/lib/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [projects, openCount] = await Promise.all([listProjects(user.id), openDecisionCount(user.id)]);
  return (
    <AppShell user={user} openCount={openCount} projects={projects.map((p) => ({ id: p.id, code: p.code, name: p.name }))}>
      {children}
    </AppShell>
  );
}
