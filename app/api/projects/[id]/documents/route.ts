import { NextResponse } from "next/server";
import { db, documents } from "@/db";
import { jsonError, ownedProject, requireApiUser } from "@/lib/api";
import { DOC_TYPES } from "@/lib/constants";

export async function POST(req: Request, ctx: RouteContext<"/api/projects/[id]/documents">) {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  if (!(await ownedProject(user.id, id))) return jsonError("Project not found.", 404);
  const b = (await req.json().catch(() => ({}))) as { type?: string; fileName?: string; text?: string };
  if (!(DOC_TYPES as readonly string[]).includes(b.type ?? "")) return jsonError("Pick a document type.");
  if (!b.text || !b.fileName) return jsonError("Upload a file first.");
  const doc = { id: crypto.randomUUID(), projectId: id, type: b.type!, fileName: b.fileName, extractedText: b.text, charCount: b.text.length, uploadedAt: Date.now() };
  await db.insert(documents).values(doc);
  return NextResponse.json({ id: doc.id, type: doc.type, fileName: doc.fileName, charCount: doc.charCount }, { status: 201 });
}
