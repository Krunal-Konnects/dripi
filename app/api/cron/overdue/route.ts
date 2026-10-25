import { NextResponse } from "next/server";
import { and, eq, lt } from "drizzle-orm";
import { db, decisions, ready } from "@/db";

/** Daily: Open decisions past their reply-by date become Overdue. */
export async function GET(req: Request) {
  await ready();
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const today = new Date().toISOString().slice(0, 10);
  const res = await db.update(decisions).set({ status: "Overdue" }).where(and(eq(decisions.status, "Open"), lt(decisions.replyBy, today))).returning({ id: decisions.id });
  return NextResponse.json({ ok: true, updated: res.length });
}
