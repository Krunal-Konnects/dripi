import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  signoffDate: text("signoff_date").notNull(), // YYYY-MM-DD
  createdAt: integer("created_at").notNull(),
  lastCheckedAt: integer("last_checked_at"),
});

export const stakeholders = sqliteTable("stakeholders", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  name: text("name").notNull(),
  team: text("team").notNull(),
  email: text("email").notNull(),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  type: text("type").notNull(), // SOW | PRD | Compliance | Meeting notes | Email
  fileName: text("file_name").notNull(),
  extractedText: text("extracted_text").notNull(),
  charCount: integer("char_count").notNull(),
  uploadedAt: integer("uploaded_at").notNull(),
});

export const scopeChecks = sqliteTable("scope_checks", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  status: text("status").notNull(), // running | done | failed
  candidatesCount: integer("candidates_count").notNull().default(0),
  droppedCount: integer("dropped_count").notNull().default(0),
  docCount: integer("doc_count").notNull().default(0),
  model: text("model").notNull(),
  error: text("error"),
  startedAt: integer("started_at").notNull(),
  finishedAt: integer("finished_at"),
});

export const findings = sqliteTable("findings", {
  id: text("id").primaryKey(),
  scopeCheckId: text("scope_check_id").notNull(),
  projectId: text("project_id").notNull(),
  documentId: text("document_id").notNull(),
  docType: text("doc_type").notNull(),
  docName: text("doc_name").notNull(),
  risk: text("risk").notNull(), // high | medium | low
  rank: integer("rank").notNull(),
  question: text("question").notNull(),
  sowQuote: text("sow_quote").notNull(),
  sowHighlight: text("sow_highlight").notNull(),
  otherQuote: text("other_quote").notNull(),
  otherHighlight: text("other_highlight").notNull(),
  impact: text("impact").notNull(),
  suggestedTeam: text("suggested_team").notNull(),
  stakeholderId: text("stakeholder_id"),
  recipientEmail: text("recipient_email"),
  status: text("status").notNull(), // open | notified | dismissed
  dismissedReason: text("dismissed_reason"),
  quoteHash: text("quote_hash").notNull(),
  sentTo: text("sent_to"),
  sentAt: integer("sent_at"),
  createdAt: integer("created_at").notNull(),
});

export const decisions = sqliteTable("decisions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  code: text("code").notNull(),
  findingId: text("finding_id").notNull(),
  projectId: text("project_id").notNull(),
  stakeholderId: text("stakeholder_id"),
  ownerName: text("owner_name").notNull(),
  ownerTeam: text("owner_team").notNull(),
  question: text("question").notNull(),
  sowQuote: text("sow_quote").notNull(),
  otherQuote: text("other_quote").notNull(),
  docType: text("doc_type").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  replyBy: text("reply_by").notNull(),
  sentAt: integer("sent_at").notNull(),
  status: text("status").notNull(), // Open | Answered | Ignored | Overdue
  outcome: text("outcome").notNull(), // Not known yet | Caused rework | No rework
  emailMessageId: text("email_message_id"),
  deliveryStatus: text("delivery_status").notNull(), // sent | delivered | bounced | complained | simulated
});

export const emailEvents = sqliteTable("email_events", {
  id: text("id").primaryKey(),
  decisionId: text("decision_id"),
  providerEventId: text("provider_event_id").notNull().unique(),
  type: text("type").notNull(),
  payload: text("payload").notNull(),
  receivedAt: integer("received_at").notNull(),
});
