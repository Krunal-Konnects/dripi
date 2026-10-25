import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import nodemailer, { type Transporter } from "nodemailer";

export type EmailInput = {
  to: string;
  toName: string;
  replyTo: string;
  pmName: string;
  subject: string;
  body: string; // plain text, edited by the PM
  tags: { name: string; value: string }[];
  idempotencyKey: string;
};

export type EmailResult = { id: string; simulated: boolean };

export type EmailProvider = "smtp" | "resend" | "simulated";

/** EMAIL_PROVIDER forces one; otherwise SMTP (e.g. Gmail) → Resend → simulated. */
export function emailProvider(): EmailProvider {
  const forced = process.env.EMAIL_PROVIDER as EmailProvider | undefined;
  if (forced === "smtp" || forced === "resend" || forced === "simulated") return forced;
  if (process.env.SMTP_USER && process.env.SMTP_PASS) return "smtp";
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM) return "resend";
  return "simulated";
}

export const emailConfigured = () => emailProvider() !== "simulated";

let transporter: Transporter | null = null;
function smtp(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
      auth: { user: process.env.SMTP_USER, pass: (process.env.SMTP_PASS || "").replace(/\s+/g, "") },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
      tls: process.env.SMTP_ALLOW_SELF_SIGNED === "true" ? { rejectUnauthorized: false } : undefined,
    });
  }
  return transporter;
}

function smtpError(e: unknown): string {
  const err = e as { code?: string; responseCode?: number; message?: string };
  if (err.code === "EAUTH" || err.responseCode === 535) {
    return "Gmail rejected the login. Use a 16-character App Password (Google Account → Security → App passwords), not your normal password.";
  }
  if (err.code === "ETIMEDOUT" || err.code === "ECONNECTION" || err.code === "ESOCKET") {
    return "Couldn't reach the mail server. Check your internet connection and the SMTP_HOST / SMTP_PORT settings.";
  }
  return `Email failed: ${err.message ?? "unknown error"}`;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Plain, client-friendly HTML: the PM's text, paragraphs preserved, quotes set off. No images or tracking. */
export function renderHtml(body: string, pmName: string): string {
  const paras = body
    .split(/\n{2,}/)
    .map((p) => {
      const t = esc(p).replace(/\n/g, "<br>");
      const isQuote = /^[“"]/.test(p.trim());
      return isQuote
        ? `<p style="margin:0 0 16px;padding:10px 14px;border-left:3px solid #0b6e78;background:#f4f6f5;color:#111615">${t}</p>`
        : `<p style="margin:0 0 16px">${t}</p>`;
    })
    .join("");
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#ffffff;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#111615"><div style="max-width:600px">${paras}<p style="margin:24px 0 0;font-size:12px;color:#68716f">Sent with Dripi for ${esc(pmName)}. Reply to this email to answer.</p></div></body></html>`;
}

type Outgoing = {
  to: string;
  toName: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
  tags: { name: string; value: string }[];
  idempotencyKey: string;
};

/** Sends one email through SMTP (e.g. Gmail) or Resend. With neither configured the send is simulated and logged. */
async function deliver(m: Outgoing): Promise<EmailResult> {
  const provider = emailProvider();
  if (provider === "smtp") {
    const user = process.env.SMTP_USER!;
    try {
      const info = await smtp().sendMail({
        from: process.env.SMTP_FROM || `Dripi <${user}>`,
        to: { name: m.toName, address: m.to },
        replyTo: m.replyTo,
        subject: m.subject,
        text: m.text,
        html: m.html,
        headers: Object.fromEntries(m.tags.map((t) => [`X-Dripi-${t.name}`, t.value])),
      });
      return { id: info.messageId, simulated: false };
    } catch (e) {
      throw new Error(smtpError(e));
    }
  }
  if (provider === "simulated") {
    const id = "simulated_" + createHash("sha256").update(m.idempotencyKey).digest("hex").slice(0, 16);
    console.info(`[dripi] Email simulated (no SMTP or Resend settings) → ${m.to}: ${m.subject}`);
    return { id, simulated: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": m.idempotencyKey,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM,
      to: [`${m.toName} <${m.to}>`],
      reply_to: m.replyTo,
      subject: m.subject,
      text: m.text,
      html: m.html,
      tags: m.tags,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok || !data.id) {
    throw new Error(data.message ? `Resend: ${data.message}` : `Resend returned ${res.status}.`);
  }
  return { id: data.id, simulated: false };
}

/** A decision request written by the PM. Replies go to the PM. */
export async function sendDecisionEmail(input: EmailInput): Promise<EmailResult> {
  return deliver({
    to: input.to,
    toName: input.toName,
    replyTo: input.replyTo,
    subject: input.subject,
    text: `${input.body}\n\n—\nSent with Dripi for ${input.pmName}. Reply to this email to answer.`,
    html: renderHtml(input.body, input.pmName),
    tags: input.tags,
    idempotencyKey: input.idempotencyKey,
  });
}

/** Sent once after a new account is created. */
export async function sendWelcomeEmail(user: { name: string; email: string }, loginUrl: string): Promise<EmailResult> {
  const first = user.name.trim().split(/\s+/)[0] || "there";
  const features = [
    ["Projects", "Add a project with its signed SOW and the stakeholders who decide."],
    ["Scope check", "Upload PRDs, compliance notes, meeting notes or emails and compare them against the SOW."],
    ["Results", "See every conflict ranked by risk, with exact quotes from both documents."],
    ["Notify", "Email each conflict to the right stakeholder in one click."],
    ["Decisions", "Track every answer and whether it caused rework."],
  ];
  const text =
    `Hi ${first},\n\nWelcome to Dripi. Your account is ready.\n\nPlease log in and explore the features:\n` +
    features.map(([t, d]) => `- ${t}: ${d}`).join("\n") +
    `\n\nLog in: ${loginUrl}\n\nYou're receiving this because you signed up with ${user.email}.\n— The Dripi team`;
  const rows = features
    .map(([t, d]) => `<tr><td style="padding:6px 0;vertical-align:top;width:110px;font-weight:600;color:#111615">${esc(t)}</td><td style="padding:6px 0;color:#525c5a">${esc(d)}</td></tr>`)
    .join("");
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f4f6f5;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111615">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
  <div style="font-size:22px;font-weight:700;letter-spacing:-0.02em;margin-bottom:20px">dripi<span style="color:#0b6e78">.</span></div>
  <div style="background:#ffffff;border:1px solid #e0e4e2;border-radius:16px;padding:28px">
    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;letter-spacing:-0.02em">Welcome to Dripi, ${esc(first)}</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#525c5a">Your account is ready. Please log in and explore the features.</p>
    <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.5;margin:0 0 24px">${rows}</table>
    <a href="${esc(loginUrl)}" style="display:inline-block;background:#111615;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">Log in to Dripi</a>
  </div>
  <p style="margin:16px 4px 0;font-size:12px;line-height:1.5;color:#68716f">You're receiving this because you signed up for Dripi with ${esc(user.email)}.</p>
</div></body></html>`;
  return deliver({
    to: user.email,
    toName: user.name,
    subject: "Welcome to Dripi",
    text,
    html,
    tags: [{ name: "type", value: "welcome" }],
    idempotencyKey: `welcome-${user.email}`,
  });
}

/** Verifies a Resend (Svix) webhook signature. */
export function verifyWebhook(rawBody: string, headers: Headers): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const id = headers.get("svix-id");
  const ts = headers.get("svix-timestamp");
  const sigHeader = headers.get("svix-signature");
  if (!secret || !id || !ts || !sigHeader) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 5 * 60) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${rawBody}`).digest("base64");
  return sigHeader.split(" ").some((part) => {
    const sig = part.split(",")[1];
    if (!sig) return false;
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}
