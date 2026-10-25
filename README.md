# Dripi — Drift Picker

Dripi compares every project document (PRDs, compliance notes, meeting notes, emails) against the signed SOW, shows each scope conflict with word-for-word quotes, emails it to the stakeholder who decides, and tracks the answer in a decision ledger.

## Run it on your Mac

```bash
cd ~/dripi
npm install          # installs the new packages for macOS
npm run dev          # http://localhost:3000
```

Then:

1. **Sign up**, then log in.
2. **New project** → click **Fill with sample project** (or enter your own) → **Create project**.
3. **Scope check** → **Use sample documents** (or upload PDF/DOCX/TXT files) → **Let's compare**.
4. On **Results**, review the ranked conflicts → **Notify** → edit the email → **Send email**.
5. Track answers on **Decisions** (status and outcome are editable).

The database is a local SQLite file at `data/dripi.db`, created automatically. Delete it to start fresh.

## Settings (`.env.local`)

`.env.local` is already created and git-ignored. Template: `.env.example`.

| Variable | What it does |
| --- | --- |
| `ANTHROPIC_API_KEY` | An `sk-ant-…` key from console.anthropic.com. Uses Claude Sonnet 5.5 directly. |
| `OPENROUTER_API_KEY` | Your existing OpenRouter key (already filled in). Used when no Anthropic key is set; model `anthropic/claude-sonnet-5.5`. |
| `MODEL_PROVIDER` | Blank = automatic (Anthropic → OpenRouter → demo). Set `demo` for canned results on the sample files, no key needed. |
| `MODEL_NAME`, `MODEL_EFFORT` | `claude-sonnet-5-5`, `high` (or `medium` for faster, cheaper runs). |
| `SMTP_USER`, `SMTP_PASS` | Gmail address + 16-character App Password. When set, emails are sent through Gmail SMTP (`smtp.gmail.com:465`). `SMTP_FROM` is optional. |
| `APP_URL` | Public address used for the login link in the welcome email (blank = the address the app runs on). |
| `EMAIL_PROVIDER` | Blank = automatic (SMTP → Resend → simulated). Or force `smtp`, `resend` or `simulated`. |
| `RESEND_API_KEY`, `RESEND_FROM` | Real email sending through Resend. Empty = sending is **simulated** (the decision is still recorded; the UI says so). `RESEND_FROM` must be a verified sender, e.g. `Dripi <decisions@your-domain.com>`. |
| `RESEND_WEBHOOK_SECRET` | Signing secret for `POST /api/webhooks/resend` (delivery, bounce, spam events). |
| `DATABASE_URL`, `DATABASE_AUTH_TOKEN` | `file:./data/dripi.db` locally; a Turso URL + token on Vercel. |
| `AUTH_SECRET`, `CRON_SECRET` | Random strings (already generated). |

## Useful commands

```bash
npm run compare -- sample-data/SOW_Clinic-Portal_signed.txt sample-data/PRD_v3_patient-messaging.txt
                       # run one comparison from the terminal and print verified findings
npm test               # quote verification, ranking and dedupe tests
npm run typecheck      # route types + TypeScript
npm run lint
npm run build && npm start
```

## How it works

- **Comparison** (`lib/llm.ts`, `app/api/projects/[id]/checks`): one Claude call per document, up to 3 in parallel, JSON-schema structured output, the SOW cached across calls. Progress streams to the browser as server-sent events. Sonnet 5.5 rejects `temperature`, so none is sent.
- **Quote verification** (`lib/pipeline.ts`): every quote must appear word for word in its source (whitespace and curly quotes normalised). Failures are dropped and counted. Findings are de-duplicated, ranked High → Medium → Low, capped at 10. Re-runs keep already-notified conflicts as notified.
- **Email** (`lib/email.ts`, `app/api/findings/[id]/send`): Gmail SMTP via nodemailer, or the Resend REST API with an idempotency key; Reply-To is the PM. A decision (D-001, D-002 …) is created only after the send succeeds.
- **Files** (`lib/extract.ts`): PDF (pdf-parse), DOCX (mammoth), TXT; parsed in memory, only text is stored. Files with almost no text are rejected as scanned.
- **Auth** (`lib/session.ts`): bcrypt password hashes and a signed, HTTP-only session cookie. Every API route checks the session and project ownership.
- **Welcome email** (`app/api/auth/signup`): every new sign-up gets a "Welcome to Dripi" email with a login link, sent after the response so a mail problem never blocks registration.
- **Overdue job** (`app/api/cron/overdue`, `vercel.json`): daily, Open decisions past their reply-by date become Overdue.

## Deploy to Vercel

1. Push to GitHub and import the repo in Vercel.
2. Create a Turso database and set `DATABASE_URL` + `DATABASE_AUTH_TOKEN`.
3. Set the model key, `RESEND_*`, `AUTH_SECRET` and `CRON_SECRET` in Vercel's environment variables.
4. In Resend, verify your sending domain and add a webhook to `https://<your-app>/api/webhooks/resend`.

Use synthetic documents only on a hosted demo.

## Folder notes

- `_old-attempt/` is an earlier partial build (renamed from the inner `dripi/` folder). Don't run it; it's ignored by TypeScript and ESLint and can be deleted.
- `public/samples/` and `sample-data/` hold the synthetic healthcare sample documents.
