import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, findings, stakeholders } from "@/db";
import { jsonError, ownedProject, requireApiUser } from "@/lib/api";
import { DISMISS_REASONS } from "@/lib/constants";

export async function PATCH(req: Request, ctx: RouteContext<"/api/findings/[id]">) {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const f = await db.query.findings.findFirst({ where: eq(findings.id, id) });
  if (!f || !(await ownedProject(user.id, f.projectId))) return jsonError("Finding not found.", 404);
  const b = (await req.json().catch(() => ({}))) as { stakeholderId?: string; email?: string; action?: "dismiss" | "undo"; reason?: string };

  if (b.action === "dismiss") {
    if (f.status !== "open") return jsonError("Only open conflicts can be dismissed.");
    if (!(DISMISS_REASONS as readonly string[]).includes(b.reason ?? "")) return jsonError("Pick a reason.");
    await db.update(findings).set({ status: "dismissed", dismissedReason: b.reason! }).where(eq(findings.id, id));
  } else if (b.action === "undo") {
    if (f.status !== "dismissed") return jsonError("Nothing to undo.");
    await db.update(findings).set({ status: "open", dismissedReason: null }).where(eq(findings.id, id));
  } else {
    const patch: Partial<typeof findings.$inferInsert> = {};
    if (b.stakeholderId) {
      const s = await db.query.stakeholders.findFirst({ where: and(eq(stakeholders.id, b.stakeholderId), eq(stakeholders.projectId, f.projectId)) });
      if (!s) return jsonError("Stakeholder not found.", 404);
      patch.stakeholderId = s.id;
      patch.recipientEmail = s.email;
    }
    if (typeof b.email === "string") patch.recipientEmail = b.email.trim();
    if (Object.keys(patch).length) await db.update(findings).set(patch).where(eq(findings.id, id));
  }
  return NextResponse.json({ ok: true });
}
