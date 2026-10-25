import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, ready, users } from "@/db";
import { jsonError, rateLimited } from "@/lib/api";
import { setSession } from "@/lib/session";

export async function POST(req: Request) {
  await ready();
  const { email, password } = (await req.json().catch(() => ({}))) as Record<string, string>;
  if (rateLimited(`login:${(email ?? "").toLowerCase()}`, 30)) return jsonError("Too many attempts. Try again later.", 429);
  const user = email ? await db.query.users.findFirst({ where: eq(users.email, email.trim().toLowerCase()) }) : undefined;
  const ok = user && password ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok) return jsonError("That email and password don’t match.", 401);
  await setSession(user.id);
  return NextResponse.json({ ok: true, name: user.name });
}
