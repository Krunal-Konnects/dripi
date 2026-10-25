import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, documents, projects, stakeholders } from "@/db";
import { requireApiUser } from "@/lib/api";
import { TEAMS } from "@/lib/constants";

type Body = {
  name?: string;
  signoffDate?: string;
  stakeholders?: { team: string; name: string; email: string }[];
  sow?: { fileName: string; text: string };
};

export async function POST(req: Request) {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;
  const b = (await req.json().catch(() => ({}))) as Body;
  const fields: Record<string, string> = {};
  if (!b.name?.trim()) fields.name = "Give the project a name.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.signoffDate ?? "")) fields.date = "Add the SOW sign-off date.";
  const people = (b.stakeholders ?? []).filter((s) => s.name?.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email ?? ""));
  if (!people.length) fields.stake = "Add at least one stakeholder with a name and a valid email.";
  if (people.some((s) => !(TEAMS as readonly string[]).includes(s.team))) fields.stake = "Pick a team for every stakeholder.";
  if (!b.sow?.text || b.sow.text.length < 200) fields.sow = "Upload the signed SOW.";
  if (Object.keys(fields).length) return NextResponse.json({ error: "Check the highlighted fields.", fields }, { status: 400 });

  const mine = await db.select({ code: projects.code }).from(projects).where(eq(projects.userId, user.id));
  const next = mine.reduce((m, p) => Math.max(m, Number(p.code.slice(1)) || 100), 100) + 1;
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.insert(projects).values({ id, userId: user.id, code: `P${next}`, name: b.name!.trim(), signoffDate: b.signoffDate!, createdAt: now });
  await db.insert(stakeholders).values(people.map((s) => ({ id: crypto.randomUUID(), projectId: id, name: s.name.trim(), team: s.team, email: s.email.trim() })));
  await db.insert(documents).values({ id: crypto.randomUUID(), projectId: id, type: "SOW", fileName: b.sow!.fileName, extractedText: b.sow!.text, charCount: b.sow!.text.length, uploadedAt: now });
  return NextResponse.json({ id, code: `P${next}` }, { status: 201 });
}

export async function GET() {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;
  const rows = await db.select().from(projects).where(eq(projects.userId, user.id));
  return NextResponse.json(rows);
}
