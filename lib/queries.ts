import "server-only";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db, decisions, documents, findings, projects, ready, scopeChecks, stakeholders } from "@/db";
import { getSessionUser } from "./session";

export async function requireUser() {
  await ready();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function listProjects(userId: string) {
  const rows = await db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const people = await db.select({ projectId: stakeholders.projectId }).from(stakeholders).where(inArray(stakeholders.projectId, ids));
  const sows = await db
    .select({ projectId: documents.projectId, fileName: documents.fileName, uploadedAt: documents.uploadedAt })
    .from(documents)
    .where(and(inArray(documents.projectId, ids), eq(documents.type, "SOW")));
  return rows.map((p) => {
    const sow = sows.find((d) => d.projectId === p.id);
    return { ...p, stakeCount: people.filter((s) => s.projectId === p.id).length, sowName: sow?.fileName ?? "", sowUploadedAt: sow?.uploadedAt ?? null };
  });
}

export async function getProject(userId: string, id: string) {
  const p = await db.query.projects.findFirst({ where: and(eq(projects.id, id), eq(projects.userId, userId)) });
  return p ?? null;
}

export async function getProjectDocs(projectId: string) {
  const sow = await db.query.documents.findFirst({ where: and(eq(documents.projectId, projectId), eq(documents.type, "SOW")) });
  const docs = await db
    .select({ id: documents.id, type: documents.type, fileName: documents.fileName, charCount: documents.charCount, uploadedAt: documents.uploadedAt })
    .from(documents)
    .where(and(eq(documents.projectId, projectId), ne(documents.type, "SOW")))
    .orderBy(documents.uploadedAt);
  return { sow: sow ? { fileName: sow.fileName, charCount: sow.charCount, uploadedAt: sow.uploadedAt } : null, docs };
}

export async function getLatestResults(projectId: string) {
  const check = await db.query.scopeChecks.findFirst({
    where: and(eq(scopeChecks.projectId, projectId), eq(scopeChecks.status, "done")),
    orderBy: desc(scopeChecks.startedAt),
  });
  if (!check) return null;
  const rows = await db.select().from(findings).where(eq(findings.scopeCheckId, check.id)).orderBy(findings.rank);
  const people = await db.select().from(stakeholders).where(eq(stakeholders.projectId, projectId));
  return { check, findings: rows, stakeholders: people };
}

export async function listDecisions(userId: string) {
  const rows = await db.select().from(decisions).where(eq(decisions.userId, userId)).orderBy(desc(decisions.sentAt));
  if (!rows.length) return [];
  const ps = await db.select({ id: projects.id, code: projects.code, name: projects.name }).from(projects).where(inArray(projects.id, [...new Set(rows.map((r) => r.projectId))]));
  return rows.map((d) => {
    const p = ps.find((x) => x.id === d.projectId);
    return { ...d, projectCode: p?.code ?? "", projectName: p?.name ?? "" };
  });
}

export async function openDecisionCount(userId: string) {
  const rows = await db.select({ status: decisions.status }).from(decisions).where(eq(decisions.userId, userId));
  return rows.filter((r) => r.status === "Open" || r.status === "Overdue").length;
}

export async function getStakeholders(projectId: string) {
  return db.select().from(stakeholders).where(eq(stakeholders.projectId, projectId));
}
