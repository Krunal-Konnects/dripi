import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db, documents } from "@/db";
import { jsonError, ownedProject, requireApiUser } from "@/lib/api";
import { DOC_TYPES } from "@/lib/constants";

async function load(userId: string, id: string) {
  const doc = await db.query.documents.findFirst({ where: and(eq(documents.id, id), ne(documents.type, "SOW")) });
  if (!doc || !(await ownedProject(userId, doc.projectId))) return null;
  return doc;
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/documents/[id]">) {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  if (!(await load(user.id, id))) return jsonError("Document not found.", 404);
  await db.delete(documents).where(eq(documents.id, id));
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/documents/[id]">) {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  if (!(await load(user.id, id))) return jsonError("Document not found.", 404);
  const { type } = (await req.json().catch(() => ({}))) as { type?: string };
  if (!(DOC_TYPES as readonly string[]).includes(type ?? "")) return jsonError("Pick a document type.");
  await db.update(documents).set({ type: type! }).where(eq(documents.id, id));
  return NextResponse.json({ ok: true });
}
