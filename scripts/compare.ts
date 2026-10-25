/**
 * CLI: compare one document against an SOW and print verified findings.
 *   npm run compare -- sample-data/SOW_Clinic-Portal_signed.txt sample-data/PRD_v3_patient-messaging.txt
 * Reads keys from .env.local. Set MODEL_PROVIDER=demo to try it without a key.
 */
import { readFileSync } from "node:fs";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const [sowPath, docPath, type = "PRD"] = process.argv.slice(2);
  if (!sowPath || !docPath) {
    console.error("Usage: npm run compare -- <sow.txt> <document.txt> [type]");
    process.exit(1);
  }
  const { compareDocument, modelLabel } = await import("../lib/llm");
  const { verifyAndRank } = await import("../lib/pipeline");
  const sow = readFileSync(sowPath, "utf8");
  const doc = readFileSync(docPath, "utf8");
  console.log(`Model: ${modelLabel()}\nComparing ${docPath} against ${sowPath}…\n`);
  const raw = await compareDocument(sow, type, docPath, doc);
  const { kept, candidates, dropped } = verifyAndRank(sow, [{ docIndex: 0, docText: doc, findings: raw }]);
  console.log(`${candidates} candidates, ${dropped} dropped by quote verification, ${kept.length} kept.\n`);
  for (const f of kept) {
    console.log(`[${f.risk.toUpperCase()}] ${f.question}  → ${f.suggested_team}`);
    console.log(`  SOW: "${f.sow_quote}"`);
    console.log(`  DOC: "${f.other_quote}"`);
    console.log(`  If unresolved: ${f.impact}\n`);
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
