"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, BadgeCheck, Bell, Check, CheckCircle2, ChevronRight, Copy, FileCheck2, Info, Loader2, Send, Undo2, X } from "lucide-react";
import { api } from "@/lib/client";
import { DISMISS_REASONS, fmtIsoDate } from "@/lib/constants";
import { DOC_ICON } from "./scope-check";
import { Portal } from "./portal";
import { useToast } from "./toast";
import { Btn, Eyebrow, Field, Hi, RISK, RiskBadge, Select, cx } from "./ui";

export type FindingDTO = {
  id: string; risk: "high" | "medium" | "low"; docType: string; docName: string; question: string; impact: string;
  sowQuote: string; sowHighlight: string; otherQuote: string; otherHighlight: string; suggestedTeam: string;
  stakeholderId: string | null; recipientEmail: string | null; status: "open" | "notified" | "dismissed";
  dismissedReason: string | null; sentTo: string | null; sentAt: string;
};
type Person = { id: string; name: string; team: string; email: string };
type ProjectDTO = { id: string; code: string; name: string; signoffIso: string };

export function Results({ project, check, initial, people, pm, emailLive }: {
  project: ProjectDTO;
  check: { date: string; docCount: number; candidates: number; dropped: number; errors: string | null; model: string };
  initial: FindingDTO[];
  people: Person[];
  pm: { name: string };
  emailLive: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [sending, setSending] = useState<FindingDTO | null>(null);
  const upd = (id: string, p: Partial<FindingDTO>) => setItems((fs) => fs.map((f) => (f.id === id ? { ...f, ...p } : f)));
  const counts = { high: items.filter((f) => f.risk === "high").length, medium: items.filter((f) => f.risk === "medium").length, low: items.filter((f) => f.risk === "low").length };
  const open = items.filter((f) => f.status === "open").length;
  const sent = items.filter((f) => f.status === "notified").length;
  const dis = items.filter((f) => f.status === "dismissed").length;
  const list = items.filter((f) => filter === "all" || f.risk === filter);

  return (
    <div className="rise flex flex-col gap-7 max-w-[980px]">
      <header className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-faint">
            <span className="font-mono text-[12px] text-muted px-2 py-0.5 rounded-md bg-sunken">{project.code}</span>
            <Link href={`/projects/${project.id}/check`} className="hover:text-ink underline-offset-4 hover:underline">{project.name}</Link>
            <ChevronRight size={13} aria-hidden="true" /><span>Scope check · {check.date}</span>
          </div>
          <Link href="/projects" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium border border-line-strong bg-surface hover:bg-sunken"><X size={14} aria-hidden="true" />Close</Link>
        </div>
        {items.length > 0 && (
          <div className="flex flex-col gap-2 max-w-[640px]">
            <h1 className="font-display text-[40px] leading-[1.05] font-semibold tracking-[-0.035em]">
              {open === 0 ? "Every decision is handled." : `${open} ${open === 1 ? "decision" : "decisions"} to make`}
            </h1>
            <p className="text-muted">
              Checked {check.docCount} {check.docCount === 1 ? "document" : "documents"} against the signed SOW. {check.candidates} {check.candidates === 1 ? "candidate" : "candidates"} found
              {check.dropped > 0 ? `, ${check.dropped} dropped because a quote did not match its source word for word or repeated another.` : ", all quotes verified word for word."}
            </p>
          </div>
        )}
        {check.model === "demo" && (
          <p className="self-start text-[12.5px] px-2.5 py-1 rounded-full bg-med-soft text-med font-medium">Demo mode · canned findings for the sample documents</p>
        )}
        {check.errors && (
          <div role="alert" className="flex gap-2.5 items-start p-3 rounded-xl bg-med-soft text-med text-[13px]">
            <AlertCircle size={15} className="shrink-0 mt-0.5" aria-hidden="true" /><span className="whitespace-pre-line">Some documents couldn’t be compared:{"\n"}{check.errors}</span>
          </div>
        )}
      </header>

      {items.length === 0 ? (
        <div className="rounded-3xl bg-surface ring-1 ring-line py-20 px-6 flex flex-col items-center text-center gap-4">
          <span className="w-14 h-14 rounded-full bg-ok-soft text-ok inline-flex items-center justify-center"><Check size={26} strokeWidth={2.25} aria-hidden="true" /></span>
          <h1 className="font-display text-[34px] font-semibold tracking-tight">No conflicts found</h1>
          <p className="text-muted max-w-[440px]">All {check.docCount} documents agree with the signed SOW. Run the check again when new documents arrive.</p>
          <Link href="/projects" className="inline-flex items-center h-10 px-4 rounded-[10px] bg-ink text-bg text-sm font-medium hover:opacity-90">Back to projects</Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="group" aria-label="Filter by risk" className="flex flex-wrap gap-2">
              {([["all", "All", items.length, ""], ["high", "High", counts.high, RISK.high.dot], ["medium", "Medium", counts.medium, RISK.medium.dot], ["low", "Low", counts.low, RISK.low.dot]] as const).map(([k, l, c, dot]) => (
                <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}
                  className={cx("h-8 px-3 rounded-full text-[13px] font-medium inline-flex items-center gap-2 ring-1 transition cursor-pointer", filter === k ? "bg-ink text-bg ring-ink" : "bg-surface text-muted ring-line-strong hover:text-ink")}>
                  {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />}{l}<span className="tnum font-mono text-[11px] opacity-70">{c}</span>
                </button>
              ))}
            </div>
            <span className="text-[12.5px] text-faint tnum">{sent} notified · {dis} dismissed · {open} open</span>
          </div>
          <div className="flex flex-col gap-4">
            {list.map((f) => (
              <FindingCard key={f.id} f={f} num={String(items.indexOf(f) + 1).padStart(2, "0")} people={people} signoff={fmtIsoDate(project.signoffIso)} upd={upd} toast={toast} onNotify={() => setSending(f)} />
            ))}
          </div>
        </>
      )}

      {sending && (
        <SendPanel f={sending} person={people.find((p) => p.id === sending.stakeholderId)} project={project} pm={pm} emailLive={emailLive}
          onClose={() => setSending(null)}
          onSent={(res) => {
            upd(sending.id, { status: "notified", sentTo: res.to, sentAt: "today" });
            setSending(null);
            toast(res.simulated ? `Email recorded for ${res.to} (simulated) · added to Decisions as ${res.code}` : `Email sent to ${res.to} · added to Decisions as ${res.code}`);
            router.refresh();
          }} />
      )}
    </div>
  );
}

function FindingCard({ f, num, people, signoff, upd, toast, onNotify }: {
  f: FindingDTO; num: string; people: Person[]; signoff: string;
  upd: (id: string, p: Partial<FindingDTO>) => void; toast: (m: string, undo?: () => void) => void; onNotify: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const DocIcon = DOC_ICON[f.docType] ?? FileCheck2;

  const undo = async () => {
    upd(f.id, { status: "open", dismissedReason: null });
    await api(`/api/findings/${f.id}`, { method: "PATCH", json: { action: "undo" } }).catch(() => {});
  };
  const dismiss = async (reason: string) => {
    upd(f.id, { status: "dismissed", dismissedReason: reason });
    setConfirm(false);
    try {
      await api(`/api/findings/${f.id}`, { method: "PATCH", json: { action: "dismiss", reason } });
      toast(`Dismissed · ${reason.toLowerCase()}`, undo);
    } catch (e) {
      upd(f.id, { status: "open", dismissedReason: null });
      toast((e as Error).message);
    }
  };
  const changePerson = (id: string) => {
    const p = people.find((x) => x.id === id);
    upd(f.id, { stakeholderId: id, recipientEmail: p?.email ?? f.recipientEmail });
    api(`/api/findings/${f.id}`, { method: "PATCH", json: { stakeholderId: id } }).catch(() => {});
  };

  if (f.status === "dismissed") {
    return (
      <div className="pop flex flex-wrap items-center gap-3 px-5 py-3.5 rounded-2xl border border-dashed border-line-strong text-muted">
        <span className="font-mono text-[12px]">{num}</span>
        <span className="flex-1 min-w-[200px] line-through">{f.question}</span>
        <span className="text-[12px] px-2.5 py-1 rounded-full bg-sunken">{f.dismissedReason}</span>
        <Btn variant="quiet" size="sm" className="text-ink" onClick={undo}><Undo2 size={14} aria-hidden="true" />Undo</Btn>
      </div>
    );
  }

  return (
    <article className={cx("rise rounded-3xl bg-surface ring-1 p-6 sm:p-7 flex flex-col gap-6 transition hover:shadow-soft", f.status === "notified" ? "ring-ok" : "ring-line hover:ring-line-strong")}>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="font-mono text-[12px] text-faint">{num}</span>
        <RiskBadge risk={f.risk} />
        <span className="text-[12.5px] text-muted inline-flex items-center gap-1.5"><DocIcon size={13} aria-hidden={true} />{f.docType} · {f.docName}</span>
        {f.status === "notified" && <span className="ml-auto h-6 px-2.5 rounded-full bg-ok-soft text-ok text-[12px] font-semibold inline-flex items-center gap-1"><Check size={12} strokeWidth={3} aria-hidden="true" />Notified</span>}
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-[26px] leading-[1.15] font-semibold tracking-[-0.025em]">{f.question}</h2>
        <p className="text-[14.5px] text-muted flex gap-2"><span className="text-ink font-medium shrink-0">If unresolved</span>{f.impact}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {([["Signed SOW", f.sowQuote, f.sowHighlight, FileCheck2, "bg-sunken"], [f.docType, f.otherQuote, f.otherHighlight, DocIcon, "bg-surface"]] as const).map(([lab, txt, hi, Icon, bg], i) => (
          <figure key={i} className={cx("m-0 rounded-2xl ring-1 ring-line p-5 flex flex-col gap-3", bg)}>
            <figcaption className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.08em] uppercase text-muted"><Icon size={13} aria-hidden={true} />{lab}</span>
              <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-accent" title="This quote appears word for word in the source"><BadgeCheck size={13} aria-hidden="true" />Exact quote</span>
            </figcaption>
            <blockquote className="m-0 text-[15px] leading-relaxed">“<Hi text={txt} mark={hi} />”</blockquote>
          </figure>
        ))}
      </div>

      {f.status === "open" && !confirm && (
        <div className="flex flex-wrap items-end gap-3 pt-5 border-t border-line">
          <div className="flex-1 min-w-[200px]">
            <Field id={`st-${f.id}`} label={<span className="inline-flex gap-2 items-baseline">Send to <span className="text-faint font-normal text-[12px]">suggested: {f.suggestedTeam}</span></span>}>
              <Select id={`st-${f.id}`} value={f.stakeholderId ?? ""} onChange={(e) => changePerson(e.target.value)}>
                {!f.stakeholderId && <option value="">Choose a stakeholder</option>}
                {people.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.team}</option>)}
              </Select>
            </Field>
          </div>
          <div className="flex-1 min-w-[220px]">
            <Field id={`em-${f.id}`} label="Email">
              <input id={`em-${f.id}`} type="email" className="fld" value={f.recipientEmail ?? ""} onChange={(e) => upd(f.id, { recipientEmail: e.target.value })}
                onBlur={(e) => api(`/api/findings/${f.id}`, { method: "PATCH", json: { email: e.target.value } }).catch(() => {})} />
            </Field>
          </div>
          <div className="flex gap-2 ml-auto">
            <Btn variant="quiet" onClick={() => setConfirm(true)}>Dismiss</Btn>
            <Btn onClick={onNotify} disabled={!f.recipientEmail}><Bell size={15} aria-hidden="true" />Notify</Btn>
          </div>
        </div>
      )}
      {f.status === "open" && confirm && (
        <div className="pop flex flex-wrap items-center gap-2 pt-5 border-t border-line" role="group" aria-label="Dismiss reason">
          <span className="font-medium mr-1">Why dismiss this?</span>
          {DISMISS_REASONS.map((r) => (
            <button key={r} onClick={() => dismiss(r)} className="h-8 px-3 rounded-full text-[13px] font-medium ring-1 ring-line-strong bg-surface hover:bg-ink hover:text-bg hover:ring-ink transition cursor-pointer">{r}</button>
          ))}
          <Btn variant="quiet" size="sm" className="ml-auto" onClick={() => setConfirm(false)}>Cancel</Btn>
        </div>
      )}
      {f.status === "notified" && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-line">
          <span className="text-[14px] text-muted">Notified <b className="font-medium text-ink">{f.sentTo}</b>{f.sentAt === "today" ? " today" : ` on ${f.sentAt}`} · reply by {signoff}</span>
          <Link href="/decisions" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium text-ink hover:bg-sunken">Track in Decisions<ArrowRight size={14} aria-hidden="true" /></Link>
        </div>
      )}
    </article>
  );
}

function SendPanel({ f, person, project, pm, emailLive, onClose, onSent }: {
  f: FindingDTO; person?: Person; project: ProjectDTO; pm: { name: string }; emailLive: boolean;
  onClose: () => void; onSent: (r: { code: string; simulated: boolean; to: string }) => void;
}) {
  const name = person?.name ?? f.recipientEmail ?? "";
  const first = name.replace(/^Dr\.?\s+/, "").split(" ")[0];
  const [subject, setSubject] = useState(`Decision needed: ${f.question}`);
  const [due, setDue] = useState(project.signoffIso);
  const build = (d: string) =>
    `Hi ${first},\n\nWhile checking ${project.name} (${project.code}) against the signed SOW, we found a point that needs your decision.\n\nThe signed SOW says:\n“${f.sowQuote}”\n\n${f.docType} (${f.docName}) says:\n“${f.otherQuote}”\n\nDecision needed: ${f.question}\nIf unresolved: ${f.impact}\n\nCould you reply by ${fmtIsoDate(d)}?\n\nThanks,\n${pm.name}`;
  const [body, setBody] = useState(build(project.signoffIso));
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [busy, onClose]);

  const changeDue = (v: string) => {
    if (!v) return setDue(v);
    setBody((b) => b.split(`reply by ${fmtIsoDate(due)}`).join(`reply by ${fmtIsoDate(v)}`));
    setDue(v);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      ta.current?.focus();
      ta.current?.select();
    }
  };
  const send = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await api<{ code: string; simulated: boolean; to: string }>(`/api/findings/${f.id}/send`, { method: "POST", json: { subject, body, replyBy: due, email: f.recipientEmail } });
      onSent(res);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Portal>
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="fadein absolute inset-0 bg-black/35 backdrop-blur-[2px]" onClick={() => !busy && onClose()} aria-hidden="true" />
      <section role="dialog" aria-modal="true" aria-labelledby="send-title" className="slidein relative w-full max-w-[560px] h-full flex flex-col bg-surface border-l border-line shadow-soft">
        <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-line">
          <div className="flex flex-col gap-1 min-w-0">
            <Eyebrow>Send preview</Eyebrow>
            <h2 id="send-title" className="font-display text-[22px] font-semibold tracking-tight">To {name}</h2>
            <span className="text-[13px] text-muted truncate">{f.recipientEmail}{person ? ` · ${person.team}` : ""}</span>
          </div>
          <Btn variant="quiet" size="icon" onClick={onClose} aria-label="Close preview" disabled={busy}><X size={17} aria-hidden="true" /></Btn>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {!emailLive && (
            <div className="flex gap-2.5 items-start p-3 rounded-xl bg-accent-soft text-ink text-[13px]">
              <Info size={15} className="shrink-0 mt-0.5 text-accent" aria-hidden="true" />
              <span>Email delivery isn’t set up yet, so sending is simulated: the decision is recorded but no email leaves Dripi. Add <code className="font-mono text-[12px]">SMTP_USER</code> and <code className="font-mono text-[12px]">SMTP_PASS</code> (Gmail) to <code className="font-mono text-[12px]">.env.local</code> to send for real.</span>
            </div>
          )}
          <Field id="sm-subj" label="Subject"><input id="sm-subj" className="fld" value={subject} onChange={(e) => setSubject(e.target.value)} autoFocus /></Field>
          <Field id="sm-due" label="Reply by" hint="Set from the SOW sign-off date."><input id="sm-due" type="date" className="fld" value={due} onChange={(e) => changeDue(e.target.value)} /></Field>
          <Field id="sm-body" label="Message"><textarea ref={ta} id="sm-body" rows={16} className="fld text-[14px]" value={body} onChange={(e) => setBody(e.target.value)} /></Field>
          <p className="text-[12.5px] text-faint">Replies go to your email address. Dripi adds a one-line footer.</p>
        </div>
        {error && (
          <div role="alert" className="mx-6 mb-3 flex gap-2.5 items-start p-3 rounded-xl bg-high-soft text-high text-[13px]">
            <AlertCircle size={15} className="shrink-0 mt-0.5" aria-hidden="true" /><span className="flex-1">{error}</span>
          </div>
        )}
        <footer className="flex flex-wrap justify-end gap-2 px-6 py-4 border-t border-line bg-sunken">
          <Btn variant="ghost" onClick={copy}>{copied ? <><Check size={16} className="text-ok" strokeWidth={2.5} aria-hidden="true" />Copied</> : <><Copy size={16} aria-hidden="true" />Copy</>}</Btn>
          <Btn onClick={send} disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : error ? <CheckCircle2 size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
            {busy ? "Sending…" : error ? "Retry" : "Send email"}
          </Btn>
        </footer>
      </section>
    </div>
    </Portal>
  );
}
