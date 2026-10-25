import "server-only";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, projects, ready } from "@/db";
import { getSessionUser, type SessionUser } from "./session";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Returns the signed-in user or a 401 response. */
export async function requireApiUser(): Promise<SessionUser | NextResponse> {
  await ready();
  const user = await getSessionUser();
  return user ?? jsonError("Your session has ended. Log in again.", 401);
}

export async function ownedProject(userId: string, projectId: string) {
  return db.query.projects.findFirst({ where: and(eq(projects.id, projectId), eq(projects.userId, userId)) });
}

/** Simple in-memory rate limit (per server instance). */
const hits = new Map<string, number[]>();
export function rateLimited(key: string, max: number, windowMs = 60 * 60 * 1000): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    hits.set(key, list);
    return true;
  }
  list.push(now);
  hits.set(key, list);
  return false;
}
