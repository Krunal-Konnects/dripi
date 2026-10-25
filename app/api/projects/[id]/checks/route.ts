import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db, documents, findings, projects, scopeChecks, stakeholders } from "@/db";
import { jsonError, ownedProject, rateLimited, requireApiUser } from "@/lib/api";
import { compareDocument, MODEL, type RawFinding } from "@/lib/llm";
import { verifyAndRank } from "@/lib/pipeline";

export const maxDuration = 300;

async function pool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

/** Runs a scope check and streams progress as server-sent events. */
export async function POST(_req: Request, ctx: RouteContext<"/api/projects/[id]/checks">) {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  const project = await ownedProject(user.id, id);
  if (!project) return jsonError("Project not found.", 404);
  if (rateLimited(`check:${user.id}`, 10)) return jsonError("You've run 10 scope checks this hour. Try again later.", 429);

  const sow = await db.query.documents.findFirst({ where: and(eq(documents.projectId, id), eq(documents.type, "SOW")) });
  const docs = await db.select().from(documents).where(and(eq(documents.projectId, id), ne(documents.type, "SOW")));
  if (!sow) return jsonError("This project has no SOW.", 400);
  if (!docs.length) return jsonError("Add at least one document to compare.", 400);

  const checkId = crypto.randomUUID();
  await db.insert(scopeChecks).values({ id: checkId, projectId: id, status: "running", model: MODEL, docCount: docs.length, startedAt: Date.now() });

  const steps = [
    `Extract text from the SOW and ${docs.length} ${docs.length === 1 ? "document" : "documents"}`,
    ...docs.map((d) => `Compare ${d.type} · ${d.fileName}`),
    "Verify every quote word for word",
    "Remove duplicates and rank by risk",
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      try {
        send({ type: "steps", steps });
        send({ type: "step", index: 0, state: "done" });
        docs.forEach((_, i) => send({ type: "step", index: i + 1, state: "active" }));

        const errors: string[] = [];
        const perDoc = await pool(docs, 3, async (d, i) => {
          let found: RawFinding[] = [];
          try {
            found = await compareDocument(sow.extractedText, d.type, d.fileName, d.extractedText);
            send({ type: "step", index: i + 1, state: "done" });
          } catch (e) {
            const message = e instanceof Error ? e.message : "Comparison failed.";
            errors.push(`${d.fileName}: ${message}`);
            send({ type: "step", index: i + 1, state: "failed", message: `${d.fileName}: ${message}` });
          }
          return { docIndex: i, docText: d.extractedText, findings: found };
        });

        if (errors.length === docs.length) throw new Error(errors[0]);

        const vIdx = docs.length + 1;
        send({ type: "step", index: vIdx, state: "active" });
        const { kept, candidates, dropped } = verifyAndRank(sow.extractedText, perDoc);
        send({ type: "step", index: vIdx, state: "done" });
        send({ type: "step", index: vIdx + 1, state: "active" });

        const people = await db.select().from(stakeholders).where(eq(stakeholders.projectId, id));
        const pick = (team: string) =>
          people.find((p) => p.team === team) ?? people.find((p) => p.team === "Project Manager") ?? people[0];
        const earlier = await db.select().from(findings).where(and(eq(findings.projectId, id), eq(findings.status, "notified")));
        const notifiedByHash = new Map(earlier.map((f) => [f.quoteHash, f]));

        const now = Date.now();
        if (kept.length) {
          await db.insert(findings).values(
            kept.map((f, rank) => {
              const doc = docs[f.docIndex];
              const who = pick(f.suggested_team);
              const prior = notifiedByHash.get(f.hash);
              return {
                id: crypto.randomUUID(),
                scopeCheckId: checkId,
                projectId: id,
                documentId: doc.id,
                docType: doc.type,
                docName: doc.fileName,
                risk: f.risk,
                rank,
                question: f.question,
                sowQuote: f.sow_quote,
                sowHighlight: f.sow_highlight,
                otherQuote: f.other_quote,
                otherHighlight: f.other_highlight,
                impact: f.impact,
                suggestedTeam: f.suggested_team,
                stakeholderId: prior?.stakeholderId ?? who?.id ?? null,
                recipientEmail: prior?.recipientEmail ?? who?.email ?? null,
                status: prior ? "notified" : "open",
                sentTo: prior?.sentTo ?? null,
                sentAt: prior?.sentAt ?? null,
                quoteHash: f.hash,
                createdAt: now,
              };
            }),
          );
        }
        await db.update(scopeChecks).set({ status: "done", candidatesCount: candidates, droppedCount: dropped, finishedAt: Date.now(), error: errors.join("\n") || null }).where(eq(scopeChecks.id, checkId));
        await db.update(projects).set({ lastCheckedAt: Date.now() }).where(eq(projects.id, id));
        send({ type: "step", index: vIdx + 1, state: "done" });
        send({ type: "done", checkId, found: kept.length, errors });
      } catch (e) {
        const message = e instanceof Error ? e.message : "The scope check failed.";
        await db.update(scopeChecks).set({ status: "failed", error: message, finishedAt: Date.now() }).where(eq(scopeChecks.id, checkId));
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
