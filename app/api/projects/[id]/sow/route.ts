import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, documents } from "@/db";
import { jsonError, ownedProject, requireApiUser } from "@/lib/api";
import { MIN_TEXT_CHARS } from "@/lib/constants";

async function load(userId: string, projectId: string) {
  if (!(await ownedProject(userId, projectId))) return null;
  return db.query.documents.findFirst({ where: and(eq(documents.projectId, projectId), eq(documents.type, "SOW")) });
}

/** The project's signed SOW as stored text. */
export async function GET(_req: Request, ctx: RouteContext<"/api/projects/[id]/sow">) {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const sow = await load(user.id, id);
  if (!sow) return jsonError("SOW not found.", 404);
  return NextResponse.json({ fileName: sow.fileName, text: sow.extractedText, charCount: sow.charCount, uploadedAt: sow.uploadedAt });
}

/** Replace the SOW with newly extracted text. Past results are kept; the next scope check uses the new SOW. */
export async function PUT(req: Request, ctx: RouteContext<"/api/projects/[id]/sow">) {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  if (!(await ownedProject(user.id, id))) return jsonError("Project not found.", 404);
  const b = (await req.json().catch(() => ({}))) as { fileName?: string; text?: string };
  if (!b.fileName || !b.text || b.text.replace(/\s/g, "").length < MIN_TEXT_CHARS) return jsonError("Upload a readable SOW file.");
  const now = Date.now();
  const existing = await load(user.id, id);
  if (existing) {
    await db.update(documents).set({ fileName: b.fileName, extractedText: b.text, charCount: b.text.length, uploadedAt: now }).where(eq(documents.id, existing.id));
  } else {
    await db.insert(documents).values({ id: crypto.randomUUID(), projectId: id, type: "SOW", fileName: b.fileName, extractedText: b.text, charCount: b.text.length, uploadedAt: now });
  }
  return NextResponse.json({ fileName: b.fileName, charCount: b.text.length, uploadedAt: now });
}
