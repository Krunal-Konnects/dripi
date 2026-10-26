import { NextResponse } from "next/server";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { db, findings, projects, stakeholders } from "@/db";
import { jsonError, ownedProject, requireApiUser } from "@/lib/api";
import { TEAMS } from "@/lib/constants";

type Body = {
  name?: string;
  signoffDate?: string;
  stakeholders?: { id?: string; team: string; name: string; email: string }[];
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Update project details and stakeholders (add, edit, remove) in one save. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  if (!(await ownedProject(user.id, id))) return jsonError("Project not found.", 404);

  const b = (await req.json().catch(() => ({}))) as Body;
  const fields: Record<string, string> = {};
  if (!b.name?.trim()) fields.name = "Give the project a name.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.signoffDate ?? "")) fields.date = "Add the SOW sign-off date.";
  const people = (b.stakeholders ?? []).filter((s) => s.name?.trim() || s.email?.trim());
  if (!people.length) fields.stake = "Keep at least one stakeholder.";
  else if (people.some((s) => !s.name?.trim() || !EMAIL.test(s.email ?? ""))) fields.stake = "Every stakeholder needs a name and a valid email.";
  else if (people.some((s) => !(TEAMS as readonly string[]).includes(s.team))) fields.stake = "Pick a team for every stakeholder.";
  if (Object.keys(fields).length) return NextResponse.json({ error: "Check the highlighted fields.", fields }, { status: 400 });

  await db.update(projects).set({ name: b.name!.trim(), signoffDate: b.signoffDate! }).where(eq(projects.id, id));

  const existing = await db.select({ id: stakeholders.id }).from(stakeholders).where(eq(stakeholders.projectId, id));
  const existingIds = new Set(existing.map((s) => s.id));
  const keptIds = people.map((s) => s.id).filter((x): x is string => !!x && existingIds.has(x));

  // Removed stakeholders: delete them and unassign any open conflicts that pointed at them.
  const removed = keptIds.length
    ? await db.select({ id: stakeholders.id }).from(stakeholders).where(and(eq(stakeholders.projectId, id), notInArray(stakeholders.id, keptIds)))
    : existing;
  if (removed.length) {
    const ids = removed.map((r) => r.id);
    await db.update(findings).set({ stakeholderId: null }).where(and(eq(findings.projectId, id), eq(findings.status, "open"), inArray(findings.stakeholderId, ids)));
    await db.delete(stakeholders).where(inArray(stakeholders.id, ids));
  }

  for (const s of people) {
    const row = { name: s.name.trim(), team: s.team, email: s.email.trim() };
    if (s.id && existingIds.has(s.id)) {
      await db.update(stakeholders).set(row).where(eq(stakeholders.id, s.id));
      // Open conflicts assigned to this person follow their new email.
      await db.update(findings).set({ recipientEmail: row.email }).where(and(eq(findings.stakeholderId, s.id), eq(findings.status, "open")));
    } else {
      await db.insert(stakeholders).values({ id: crypto.randomUUID(), projectId: id, ...row });
    }
  }

  const fresh = await db.select().from(stakeholders).where(eq(stakeholders.projectId, id));
  return NextResponse.json({ ok: true, stakeholders: fresh, removed: removed.length });
}
