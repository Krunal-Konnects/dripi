import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, quoteAppears, verifyAndRank } from "../lib/pipeline";
import type { RawFinding } from "../lib/llm";

const sow = "Patient notifications are delivered by email only.\nReports refresh  nightly.";
const doc = "Patients can reply to appointment reminders by SMS. Managers want “live” reports.";
const f = (o: Partial<RawFinding>): RawFinding => ({
  question: "Q?", risk: "medium", sow_quote: "Reports refresh nightly.", sow_highlight: "nightly",
  other_quote: "Patients can reply to appointment reminders by SMS.", other_highlight: "by SMS", impact: "x", suggested_team: "Sales", ...o,
});

test("normalize folds whitespace and curly quotes", () => {
  assert.equal(normalize("“a”\n  b"), '"a" b');
});

test("quotes must appear word for word", () => {
  assert.ok(quoteAppears("Reports refresh nightly.", sow));
  assert.ok(quoteAppears('Managers want "live" reports.', doc));
  assert.ok(!quoteAppears("Reports are refreshed nightly.", sow));
});

test("verifyAndRank drops bad quotes and duplicates, ranks by risk, caps at 10", () => {
  const findings = [
    f({ risk: "low" }),
    f({ risk: "high", sow_quote: "Patient notifications are delivered by email only.", sow_highlight: "email only" }),
    f({ risk: "high", sow_quote: "Notifications go by email." }), // paraphrase → dropped
    f({ risk: "low" }), // duplicate → dropped
    f({ suggested_team: "Nobody" as RawFinding["suggested_team"], risk: "medium", other_quote: "Managers want “live” reports.", other_highlight: "missing" }),
  ];
  const { kept, candidates, dropped } = verifyAndRank(sow, [{ docIndex: 0, docText: doc, findings }]);
  assert.equal(candidates, 5);
  assert.equal(dropped, 2);
  assert.deepEqual(kept.map((k) => k.risk), ["high", "medium", "low"]);
  assert.equal(kept[1].suggested_team, "Project Manager");
  assert.equal(kept[1].other_highlight, "");
  const many = Array.from({ length: 15 }, (_, i) => f({ sow_quote: "Reports refresh nightly.", other_quote: "Patients can reply to appointment reminders by SMS.", question: String(i), impact: String(i) }));
  assert.equal(verifyAndRank(sow, [{ docIndex: 0, docText: doc, findings: many }]).kept.length, 1);
});
