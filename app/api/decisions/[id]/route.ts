import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, decisions } from "@/db";
import { jsonError, requireApiUser } from "@/lib/api";
import { DECISION_OUTCOMES, DECISION_STATUSES } from "@/lib/constants";

export async function PATCH(req: Request, ctx: RouteContext<"/api/decisions/[id]">) {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const d = await db.query.decisions.findFirst({ where: and(eq(decisions.id, id), eq(decisions.userId, user.id)) });
  if (!d) return jsonError("Decision not found.", 404);
  const b = (await req.json().catch(() => ({}))) as { status?: string; outcome?: string };
  const patch: Partial<typeof decisions.$inferInsert> = {};
  if (b.status !== undefined) {
    if (!(DECISION_STATUSES as readonly string[]).includes(b.status)) return jsonError("Unknown status.");
    patch.status = b.status;
  }
  if (b.outcome !== undefined) {
    if (!(DECISION_OUTCOMES as readonly string[]).includes(b.outcome)) return jsonError("Unknown outcome.");
    patch.outcome = b.outcome;
  }
  if (Object.keys(patch).length) await db.update(decisions).set(patch).where(eq(decisions.id, id));
  return NextResponse.json({ ok: true });
}
