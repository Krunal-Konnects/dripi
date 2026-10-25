import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, decisions, emailEvents, ready } from "@/db";
import { verifyWebhook } from "@/lib/email";

const MAP: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

export async function POST(req: Request) {
  await ready();
  const raw = await req.text();
  if (!verifyWebhook(raw, req.headers)) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  const evt = JSON.parse(raw) as { type?: string; data?: { email_id?: string } };
  const eventId = req.headers.get("svix-id")!;
  const exists = await db.query.emailEvents.findFirst({ where: eq(emailEvents.providerEventId, eventId) });
  if (exists) return NextResponse.json({ ok: true, duplicate: true });

  const emailId = evt.data?.email_id;
  const decision = emailId ? await db.query.decisions.findFirst({ where: eq(decisions.emailMessageId, emailId) }) : undefined;
  await db.insert(emailEvents).values({
    id: crypto.randomUUID(),
    decisionId: decision?.id ?? null,
    providerEventId: eventId,
    type: evt.type ?? "unknown",
    payload: raw,
    receivedAt: Date.now(),
  });
  const status = evt.type ? MAP[evt.type] : undefined;
  if (decision && status) await db.update(decisions).set({ deliveryStatus: status }).where(eq(decisions.id, decision.id));
  return NextResponse.json({ ok: true });
}
