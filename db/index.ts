import "server-only";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdirSync } from "node:fs";
import * as schema from "./schema";

const url = process.env.DATABASE_URL || "file:./data/dripi.db";
if (url.startsWith("file:")) {
  const path = url.slice(5);
  const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ".";
  mkdirSync(dir, { recursive: true });
}

const g = globalThis as unknown as { __dripiClient?: Client; __dripiReady?: Promise<void> };
const client = g.__dripiClient ?? createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
g.__dripiClient = client;

export const db = drizzle(client, { schema });

const DDL = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, code TEXT NOT NULL, name TEXT NOT NULL, signoff_date TEXT NOT NULL, created_at INTEGER NOT NULL, last_checked_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS stakeholders (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, name TEXT NOT NULL, team TEXT NOT NULL, email TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, type TEXT NOT NULL, file_name TEXT NOT NULL, extracted_text TEXT NOT NULL, char_count INTEGER NOT NULL, uploaded_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS scope_checks (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, status TEXT NOT NULL, candidates_count INTEGER NOT NULL DEFAULT 0, dropped_count INTEGER NOT NULL DEFAULT 0, doc_count INTEGER NOT NULL DEFAULT 0, model TEXT NOT NULL, error TEXT, started_at INTEGER NOT NULL, finished_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS findings (id TEXT PRIMARY KEY, scope_check_id TEXT NOT NULL, project_id TEXT NOT NULL, document_id TEXT NOT NULL, doc_type TEXT NOT NULL, doc_name TEXT NOT NULL, risk TEXT NOT NULL, rank INTEGER NOT NULL, question TEXT NOT NULL, sow_quote TEXT NOT NULL, sow_highlight TEXT NOT NULL, other_quote TEXT NOT NULL, other_highlight TEXT NOT NULL, impact TEXT NOT NULL, suggested_team TEXT NOT NULL, stakeholder_id TEXT, recipient_email TEXT, status TEXT NOT NULL, dismissed_reason TEXT, quote_hash TEXT NOT NULL, sent_to TEXT, sent_at INTEGER, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS decisions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, code TEXT NOT NULL, finding_id TEXT NOT NULL, project_id TEXT NOT NULL, stakeholder_id TEXT, owner_name TEXT NOT NULL, owner_team TEXT NOT NULL, question TEXT NOT NULL, sow_quote TEXT NOT NULL, other_quote TEXT NOT NULL, doc_type TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, reply_by TEXT NOT NULL, sent_at INTEGER NOT NULL, status TEXT NOT NULL, outcome TEXT NOT NULL, email_message_id TEXT, delivery_status TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS email_events (id TEXT PRIMARY KEY, decision_id TEXT, provider_event_id TEXT NOT NULL UNIQUE, type TEXT NOT NULL, payload TEXT NOT NULL, received_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_findings_check ON findings(scope_check_id)`,
  `CREATE INDEX IF NOT EXISTS idx_decisions_user ON decisions(user_id)`,
];

/** Creates tables on first use, so `npm run dev` works with no migration step. */
export function ready(): Promise<void> {
  if (!g.__dripiReady) {
    g.__dripiReady = (async () => {
      for (const sql of DDL) await client.execute(sql);
    })();
  }
  return g.__dripiReady;
}

export * from "./schema";
