import { createHash } from "node:crypto";
import { MAX_FINDINGS, TEAMS } from "./constants";
import type { RawFinding } from "./llm";

/** Normalise text for quote matching: straight quotes, single spaces, consistent dashes. */
export function normalize(s: string): string {
  return s
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function quoteAppears(quote: string, source: string): boolean {
  const q = normalize(quote);
  return q.length > 0 && normalize(source).includes(q);
}

export function quoteHash(sowQuote: string, otherQuote: string): string {
  return createHash("sha256").update(`${normalize(sowQuote)}||${normalize(otherQuote)}`).digest("hex").slice(0, 32);
}

const RISK_ORDER = { high: 0, medium: 1, low: 2 } as const;

export type Verified = RawFinding & { docIndex: number; hash: string };

/**
 * Keeps only findings whose quotes appear word for word in their sources,
 * fixes highlights that don't sit inside their quote, removes duplicates,
 * ranks High → Medium → Low and caps the list.
 */
export function verifyAndRank(
  sowText: string,
  perDoc: { docIndex: number; docText: string; findings: RawFinding[] }[],
): { kept: Verified[]; candidates: number; dropped: number } {
  let candidates = 0;
  let dropped = 0;
  const seen = new Set<string>();
  const kept: Verified[] = [];
  for (const d of perDoc) {
    for (const f of d.findings) {
      candidates++;
      const valid =
        f && typeof f.sow_quote === "string" && typeof f.other_quote === "string" &&
        quoteAppears(f.sow_quote, sowText) && quoteAppears(f.other_quote, d.docText) &&
        (["high", "medium", "low"] as const).includes(f.risk);
      if (!valid) { dropped++; continue; }
      const hash = quoteHash(f.sow_quote, f.other_quote);
      if (seen.has(hash)) { dropped++; continue; }
      seen.add(hash);
      kept.push({
        ...f,
        sow_highlight: f.sow_quote.includes(f.sow_highlight) ? f.sow_highlight : "",
        other_highlight: f.other_quote.includes(f.other_highlight) ? f.other_highlight : "",
        suggested_team: (TEAMS as readonly string[]).includes(f.suggested_team) ? f.suggested_team : "Project Manager",
        docIndex: d.docIndex,
        hash,
      });
    }
  }
  kept.sort((a, b) => RISK_ORDER[a.risk] - RISK_ORDER[b.risk]);
  const capped = kept.slice(0, MAX_FINDINGS);
  return { kept: capped, candidates, dropped };
}
