import { DecisionsView } from "@/components/decisions-view";
import { fmtIsoDate, fmtTs } from "@/lib/constants";
import { listDecisions, requireUser } from "@/lib/queries";

export const metadata = { title: "Decisions · Dripi" };

/** The newest decision, if it was sent in the last 10 minutes, is highlighted. */
function recentCode(rows: { code: string; sentAt: number }[]) {
  return rows[0] && Date.now() - rows[0].sentAt < 10 * 60 * 1000 ? rows[0].code : undefined;
}

export default async function DecisionsPage() {
  const user = await requireUser();
  const rows = await listDecisions(user.id);
  return (
    <DecisionsView
      fresh={recentCode(rows)}
      initial={rows.map((d) => ({
        id: d.id, code: d.code, question: d.question, projectCode: d.projectCode, projectName: d.projectName,
        ownerName: d.ownerName, ownerTeam: d.ownerTeam, sent: fmtTs(d.sentAt), status: d.status, outcome: d.outcome,
        sowQuote: d.sowQuote, otherQuote: d.otherQuote, docType: d.docType, deliveryStatus: d.deliveryStatus, replyBy: fmtIsoDate(d.replyBy),
      }))}
    />
  );
}
