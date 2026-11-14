import { NextResponse } from "next/server";
import { ready } from "@/db";
import { jsonError, rateLimited } from "@/lib/api";
import { cleanupGuests, createGuest } from "@/lib/guest";
import { setSession } from "@/lib/session";

/** Start a guest session with a ready-made sample project. */
export async function POST(req: Request) {
  await ready();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(`guest:${ip}`, 20)) return jsonError("Too many guest sessions from this network. Try again later.", 429);
  await cleanupGuests().catch(() => 0);
  const { userId, projectId } = await createGuest();
  await setSession(userId);
  return NextResponse.json({ ok: true, projectId });
}
