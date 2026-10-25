import { after, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, ready, users } from "@/db";
import { jsonError, rateLimited } from "@/lib/api";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: Request) {
  await ready();
  const { name, email, password } = (await req.json().catch(() => ({}))) as Record<string, string>;
  const fields: Record<string, string> = {};
  if (!name?.trim()) fields.name = "Enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? "")) fields.email = "Enter a valid work email.";
  if ((password ?? "").length < 8) fields.password = "Use at least 8 characters.";
  if (Object.keys(fields).length) return NextResponse.json({ error: "Check the highlighted fields.", fields }, { status: 400 });
  if (rateLimited(`signup:${req.headers.get("x-forwarded-for") ?? "local"}`, 20)) return jsonError("Too many attempts. Try again later.", 429);

  const normalized = email.trim().toLowerCase();
  const existing = await db.query.users.findFirst({ where: eq(users.email, normalized) });
  if (existing) return NextResponse.json({ error: "An account with this email already exists.", fields: { email: "An account with this email already exists." } }, { status: 409 });

  await db.insert(users).values({
    id: crypto.randomUUID(),
    name: name.trim(),
    email: normalized,
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: Date.now(),
  });

  // Welcome email goes out after the response, so a slow or failing mail server never blocks sign-up.
  const loginUrl = `${process.env.APP_URL || new URL(req.url).origin}/login`;
  after(async () => {
    try {
      await sendWelcomeEmail({ name: name.trim(), email: normalized }, loginUrl);
    } catch (e) {
      console.error(`[dripi] Welcome email to ${normalized} failed: ${e instanceof Error ? e.message : e}`);
    }
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
