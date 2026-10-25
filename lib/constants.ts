export const TEAMS = ["FE lead", "BE lead", "DevOps", "Sales", "Project Manager", "Upper management"] as const;
export type Team = (typeof TEAMS)[number];

export const DOC_TYPES = ["PRD", "Compliance", "Meeting notes", "Email"] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const RISKS = ["high", "medium", "low"] as const;
export type Risk = (typeof RISKS)[number];

export const DISMISS_REASONS = ["Not a real conflict", "Already resolved", "Low impact"] as const;
export const DECISION_STATUSES = ["Open", "Answered", "Ignored", "Overdue"] as const;
export const DECISION_OUTCOMES = ["Not known yet", "Caused rework", "No rework"] as const;

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MIN_TEXT_CHARS = 200;
export const MAX_FINDINGS = 10;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-12" → "12 Nov 2026" */
export function fmtIsoDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

/** epoch ms → "25 Oct 2026" */
export function fmtTs(ts: number | null | undefined): string {
  if (!ts) return "";
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
