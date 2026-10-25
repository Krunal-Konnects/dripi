import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, ready, users } from "@/db";

const COOKIE = "dripi_session";
const MAX_AGE_S = 60 * 60 * 24 * 7; // 7 days

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET is missing or shorter than 16 characters. Set it in .env.local.");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function makeToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + MAX_AGE_S * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof uid !== "string" || typeof exp !== "number" || exp < Date.now()) return null;
    return uid;
  } catch {
    return null;
  }
}

export async function setSession(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE, makeToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export type SessionUser = { id: string; name: string; email: string };

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const uid = readToken(jar.get(COOKIE)?.value);
  if (!uid) return null;
  await ready();
  const row = await db.query.users.findFirst({ where: eq(users.id, uid) });
  return row ? { id: row.id, name: row.name, email: row.email } : null;
}
