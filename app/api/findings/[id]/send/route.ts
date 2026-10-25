import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, decisions, findings, projects, stakeholders, users } from "@/db";
import { jsonError, ownedProject, rateLimited, requireApiUser } from "@/lib/api";
import { sendDecisionEmail } from "@/lib/email";

const inFlight = new Set<string>();

export async function POST(req: Request, ctx: RouteContext<"/api/findings/[id]/send">) {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const f = await db.query.findings.findFirst({ where: eq(findings.id, id) });
  if (!f || !(await ownedProject(user.id, f.projectId))) return jsonError("Conflict not found.", 404);
  if (f.status === "notified") return jsonError("This conflict was already sent.", 409);
  if (f.status === "dismissed") return jsonError("Undo the dismissal before sending.", 409);

  const b = (await req.json().catch(() => ({}))) as { subject?: string; body?: string; replyBy?: string; email?: string };
  const to = (b.email ?? f.recipientEmail ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return jsonError("Enter a valid recipient email.");
  if (!b.subject?.trim() || !b.body?.trim()) return jsonError("Subject and message can't be empty.");
  if (rateLimited(`send:${user.id}`, 50)) return jsonError("You've sent 50 emails this hour. Try again later.", 429);
  if (inFlight.has(id)) return jsonError("Already sending this email.", 409);
  inFlight.add(id);

  try {
    const person = f.stakeholderId ? await db.query.stakeholders.findFirst({ where: eq(stakeholders.id, f.stakeholderId) }) : undefined;
    const project = await db.query.projects.findFirst({ where: eq(projects.id, f.projectId) });
    const pm = await db.query.users.findFirst({ where: eq(users.id, user.id) });
    const mine = await db.select({ code: decisions.code }).from(decisions).where(eq(decisions.userId, user.id));
    const nextNum = mine.reduce((m, d) => Math.max(m, Number(d.code.slice(2)) || 0), 0) + 1;
    const code = `D-${String(nextNum).padStart(3, "0")}`;
    const key = `${id}-${createHash("sha256").update(b.subject + "\n" + b.body).digest("hex").slice(0, 24)}`;

    const result = await sendDecisionEmail({
      to,
      toName: person?.name ?? to,
      replyTo: pm!.email,
      pmName: pm!.name,
      subject: b.subject.trim(),
      body: b.body,
      tags: [
        { name: "decision", value: code },
        { name: "project", value: project?.code ?? "unknown" },
      ],
      idempotencyKey: key,
    });

    const now = Date.now();
    const decisionId = crypto.randomUUID();
    await db.insert(decisions).values({
      id: decisionId,
      userId: user.id,
      code,
      findingId: f.id,
      projectId: f.projectId,
      stakeholderId: person?.id ?? null,
      ownerName: person?.name ?? to,
      ownerTeam: person?.team ?? "",
      question: f.question,
      sowQuote: f.sowQuote,
      otherQuote: f.otherQuote,
      docType: f.docType,
      subject: b.subject.trim(),
      body: b.body,
      replyBy: b.replyBy?.trim() || project?.signoffDate || "",
      sentAt: now,
      status: "Open",
      outcome: "Not known yet",
      emailMessageId: result.id,
      deliveryStatus: result.simulated ? "simulated" : "sent",
    });
    await db.update(findings).set({ status: "notified", recipientEmail: to, sentTo: person?.name ?? to, sentAt: now }).where(eq(findings.id, f.id));
    return NextResponse.json({ ok: true, code, simulated: result.simulated, to: person?.name ?? to });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "The email couldn't be sent.", 502);
  } finally {
    inFlight.delete(id);
  }
}
