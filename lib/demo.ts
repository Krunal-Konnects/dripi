import type { RawFinding } from "./llm";
import { normalize } from "./pipeline";

/**
 * Demo mode: canned findings for the bundled sample documents, so the full flow
 * works without a model key. A finding is returned only when its quote really
 * appears in the uploaded document. One candidate is deliberately paraphrased
 * so you can see quote verification drop it.
 */
const CANNED: RawFinding[] = [
  { risk: "high", suggested_team: "Sales", question: "Add two-way SMS to the project scope?",
    sow_quote: "Patient notifications are delivered by email only.", sow_highlight: "email only",
    other_quote: "Patients can reply to appointment reminders by SMS.", other_highlight: "by SMS",
    impact: "Needs an SMS vendor, consent capture and extra testing, none of it priced in the SOW." },
  { risk: "medium", suggested_team: "FE lead", question: "Add Spanish to all patient-facing screens?",
    sow_quote: "The patient portal is delivered in English.", sow_highlight: "in English",
    other_quote: "All patient-facing screens must be available in English and Spanish.", other_highlight: "English and Spanish",
    impact: "Translation, layout checks and a second round of user acceptance testing." },
  { risk: "low", suggested_team: "FE lead", question: "Does “all modern browsers” include Safari and Firefox?",
    sow_quote: "Supported browsers: Chrome and Edge, latest two versions.", sow_highlight: "Chrome and Edge, latest two versions",
    other_quote: "The portal works on all modern browsers.", other_highlight: "all modern browsers",
    impact: "Two more browsers to build for and test if the answer is yes." },
  { risk: "high", suggested_team: "DevOps", question: "Extend audit log retention from 12 months to six years?",
    sow_quote: "Audit logs are retained for 12 months and then deleted.", sow_highlight: "12 months",
    other_quote: "All access to patient records must be logged and the logs kept for at least six years.", other_highlight: "at least six years",
    impact: "Archive storage and search work not covered by the SOW. Blocks compliance sign-off." },
  { risk: "high", suggested_team: "BE lead", question: "Make MFA mandatory for every staff sign-in?",
    sow_quote: "Clinic staff sign in with email and password, with optional authenticator-app MFA.", sow_highlight: "optional authenticator-app MFA",
    other_quote: "Optional MFA is not acceptable for staff who can view lab results.", other_highlight: "Optional MFA is not acceptable",
    impact: "Changes the sign-in flow and staff onboarding. Compliance won't sign off without it." },
  { risk: "medium", suggested_team: "Upper management", question: "Move go-live from 30 November to 15 January?",
    sow_quote: "Production go-live: 30 November 2026.", sow_highlight: "30 November 2026",
    other_quote: "Go-live moves to 15 January so it lines up with clinic onboarding.", other_highlight: "15 January",
    impact: "Shifts the go-live payment milestone and keeps the team on the project six weeks longer." },
  { risk: "medium", suggested_team: "Sales", question: "Extend booking from 12 to 14 clinics at go-live?",
    sow_quote: "Appointment booking for up to 12 clinics.", sow_highlight: "up to 12 clinics",
    other_quote: "The rollout should cover all 14 clinics at go-live.", other_highlight: "all 14 clinics",
    impact: "Two more clinics to configure, train and test before go-live." },
  { risk: "low", suggested_team: "BE lead", question: "Does “as soon as data changes” mean real-time reports?",
    sow_quote: "Reports refresh nightly.", sow_highlight: "nightly",
    other_quote: "Clinic managers want reports to update as soon as data changes, so they can see same-day confirmations.", other_highlight: "as soon as data changes",
    impact: "Could be read as a new streaming feature. Clarify before design starts." },
  // Paraphrased on purpose: fails quote verification and is dropped.
  { risk: "medium", suggested_team: "BE lead", question: "Add PDF downloads of lab results?",
    sow_quote: "The lab results viewer shows completed results.", sow_highlight: "completed results",
    other_quote: "Patients can download their lab results as a PDF.", other_highlight: "as a PDF",
    impact: "New export feature not in the SOW." },
];

export async function demoFindings(docText: string): Promise<RawFinding[]> {
  await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));
  const doc = normalize(docText);
  return CANNED.filter((f) => doc.includes(normalize(f.other_quote)));
}
