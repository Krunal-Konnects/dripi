import { notFound, redirect } from "next/navigation";
import { Results, type FindingDTO } from "@/components/results";
import { fmtTs } from "@/lib/constants";
import { emailConfigured } from "@/lib/email";
import { getLatestResults, getProject, requireUser } from "@/lib/queries";

export const metadata = { title: "Results · Dripi" };

export default async function ResultsPage(props: PageProps<"/projects/[id]/results">) {
  const user = await requireUser();
  const { id } = await props.params;
  const project = await getProject(user.id, id);
  if (!project) notFound();
  const data = await getLatestResults(id);
  if (!data) redirect(`/projects/${id}/check`);
  return (
    <Results
      project={{ id: project.id, code: project.code, name: project.name, signoffIso: project.signoffDate }}
      check={{ date: fmtTs(data.check.finishedAt ?? data.check.startedAt), docCount: data.check.docCount, candidates: data.check.candidatesCount, dropped: data.check.droppedCount, errors: data.check.error, model: data.check.model }}
      initial={data.findings.map((f): FindingDTO => ({
        id: f.id, risk: f.risk as FindingDTO["risk"], docType: f.docType, docName: f.docName, question: f.question, impact: f.impact,
        sowQuote: f.sowQuote, sowHighlight: f.sowHighlight, otherQuote: f.otherQuote, otherHighlight: f.otherHighlight, suggestedTeam: f.suggestedTeam,
        stakeholderId: f.stakeholderId, recipientEmail: f.recipientEmail, status: f.status as FindingDTO["status"], dismissedReason: f.dismissedReason,
        sentTo: f.sentTo, sentAt: fmtTs(f.sentAt),
      }))}
      people={data.stakeholders.map((s) => ({ id: s.id, name: s.name, team: s.team, email: s.email }))}
      pm={{ name: user.name }}
      emailLive={emailConfigured()}
    />
  );
}
