import "server-only";
import { and, eq, inArray, like, lt } from "drizzle-orm";
import { db, decisions, documents, findings, projects, scopeChecks, stakeholders, users } from "@/db";
import { SAMPLE_DOCS, SAMPLE_SOW, SAMPLE_STAKEHOLDERS } from "./samples";

export const GUEST_DOMAIN = "guest.dripi.app";
export const GUEST_TTL_MS = 24 * 60 * 60 * 1000;

export const isGuestEmail = (email: string) => email.endsWith(`@${GUEST_DOMAIN}`);

/** Deletes everything a user owns. */
async function deleteUserData(userId: string) {
  const ps = await db.select({ id: projects.id }).from(projects).where(eq(projects.userId, userId));
  const ids = ps.map((p) => p.id);
  if (ids.length) {
    await db.delete(findings).where(inArray(findings.projectId, ids));
    await db.delete(scopeChecks).where(inArray(scopeChecks.projectId, ids));
    await db.delete(documents).where(inArray(documents.projectId, ids));
    await db.delete(stakeholders).where(inArray(stakeholders.projectId, ids));
    await db.delete(projects).where(inArray(projects.id, ids));
  }
  await db.delete(decisions).where(eq(decisions.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

/** Removes guest accounts older than 24 hours. */
export async function cleanupGuests() {
  const old = await db
    .select({ id: users.id })
    .from(users)
    .where(and(like(users.email, `%@${GUEST_DOMAIN}`), lt(users.createdAt, Date.now() - GUEST_TTL_MS)));
  for (const u of old) await deleteUserData(u.id);
  return old.length;
}

/** Creates a guest account with a ready-to-check sample project. Returns the user and project ids. */
export async function createGuest(): Promise<{ userId: string; projectId: string }> {
  const now = Date.now();
  const userId = crypto.randomUUID();
  await db.insert(users).values({
    id: userId,
    name: "Guest",
    email: `guest-${userId.slice(0, 8)}@${GUEST_DOMAIN}`,
    passwordHash: "!guest", // never matches a bcrypt hash, so guests can't log in with a password
    createdAt: now,
  });

  const projectId = crypto.randomUUID();
  const signoff = new Date(now + 18 * 864e5).toISOString().slice(0, 10);
  await db.insert(projects).values({ id: projectId, userId, code: "P101", name: "Clinic Portal v2 (sample)", signoffDate: signoff, createdAt: now });
  await db.insert(stakeholders).values(SAMPLE_STAKEHOLDERS.map((s) => ({ id: crypto.randomUUID(), projectId, ...s })));
  await db.insert(documents).values([
    { id: crypto.randomUUID(), projectId, type: "SOW", fileName: SAMPLE_SOW.fileName, extractedText: SAMPLE_SOW.text, charCount: SAMPLE_SOW.text.length, uploadedAt: now },
    ...SAMPLE_DOCS.map((d, i) => ({
      id: crypto.randomUUID(), projectId, type: d.type, fileName: d.fileName, extractedText: d.text, charCount: d.text.length, uploadedAt: now + i + 1,
    })),
  ]);
  return { userId, projectId };
}
