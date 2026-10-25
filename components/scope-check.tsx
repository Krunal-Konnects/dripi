"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, FileCheck2, FileText, Loader2, Mail, Plus, ShieldCheck, Trash2, Users, X } from "lucide-react";
import { api, extractFile } from "@/lib/client";
import { DOC_TYPES } from "@/lib/constants";
import { FileDrop, sampleFile } from "./file-drop";
import { Btn, Eyebrow, cx } from "./ui";

export const DOC_ICON: Record<string, React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>> = {
  PRD: FileText, Compliance: ShieldCheck, "Meeting notes": Users, Email: Mail, SOW: FileCheck2,
};

type Doc = { id: string; type: string; fileName: string; charCount: number };
type Row = { key: string; doc?: Doc; type: string; state: "empty" | "uploading" | "ready" | "error"; file?: string; err?: string };
type Step = { label: string; state: "pending" | "active" | "done" | "failed"; message?: string };

const SAMPLES = [
  { type: "PRD", path: "/samples/PRD_v3_patient-messaging.txt" },
  { type: "Compliance", path: "/samples/HIPAA_review_notes.txt" },
  { type: "Meeting notes", path: "/samples/Steering_call_14-Oct.txt" },
];

export function ScopeCheck({ project, sow, docs, mode }: {
  mode: { provider: string; model: string };
  project: { id: string; code: string; name: string; signoff: string; created: string; lastChecked: string; hasResults: boolean };
  sow: { fileName: string; charCount: number } | null;
  docs: Doc[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(docs.map((d) => ({ key: d.id, doc: d, type: d.type, state: "ready", file: d.fileName })));
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [runError, setRunError] = useState("");
  const n = useRef(0);

  const set = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const ready = rows.filter((r) => r.state === "ready" && r.doc);

  const upload = async (key: string, type: string, f: File) => {
    set(key, { state: "uploading", file: f.name, err: undefined });
    try {
      const ex = await extractFile(f);
      const doc = await api<Doc>(`/api/projects/${project.id}/documents`, { method: "POST", json: { type, fileName: ex.fileName, text: ex.text } });
      set(key, { state: "ready", doc, file: doc.fileName });
    } catch (e) {
      set(key, { state: "error", err: (e as Error).message });
    }
  };

  const setType = async (r: Row, type: string) => {
    set(r.key, { type });
    if (r.doc) await api(`/api/documents/${r.doc.id}`, { method: "PATCH", json: { type } }).catch(() => set(r.key, { type: r.type }));
  };

  const remove = async (r: Row) => {
    setRows((rs) => rs.filter((x) => x.key !== r.key));
    if (r.doc) await api(`/api/documents/${r.doc.id}`, { method: "DELETE" }).catch(() => setRows((rs) => [...rs, r]));
  };

  const addRow = (type = "Email") => {
    const key = `new-${n.current++}`;
    setRows((rs) => [...rs, { key, type, state: "empty" }]);
    return key;
  };

  const addSamples = async () => {
    for (const s of SAMPLES) {
      const key = addRow(s.type);
      const name = s.path.split("/").pop()!;
      upload(key, s.type, await sampleFile(s.path, name));
    }
  };

  const compare = async () => {
    setRunError("");
    setSteps([{ label: "Starting…", state: "active" }]);
    try {
      const res = await fetch(`/api/projects/${project.id}/checks`, { method: "POST" });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "The scope check couldn't start.");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const p of parts) {
          const line = p.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const evt = JSON.parse(line.slice(6));
          if (evt.type === "steps") setSteps(evt.steps.map((label: string) => ({ label, state: "pending" })));
          if (evt.type === "step") setSteps((s) => s && s.map((x, i) => (i === evt.index ? { ...x, state: evt.state, message: evt.message } : x)));
          if (evt.type === "error") throw new Error(evt.message);
          if (evt.type === "done") {
            router.push(`/projects/${project.id}/results`);
            router.refresh();
            return;
          }
        }
      }
      throw new Error("The connection closed before the check finished.");
    } catch (e) {
      setRunError((e as Error).message);
      setSteps(null);
    }
  };

  const total = steps?.length ?? 1;
  const done = steps?.filter((s) => s.state === "done" || s.state === "failed").length ?? 0;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="rise flex flex-col gap-8 max-w-[880px]">
      <header className="flex flex-col gap-3">
        <Link href="/projects" className="self-start -ml-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium text-muted hover:bg-sunken hover:text-ink">
          <ArrowLeft size={15} aria-hidden="true" />Projects
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-faint">
          <span className="font-mono text-[12px] text-muted px-2 py-0.5 rounded-md bg-sunken">{project.code}</span>
          <span>Sign-off {project.signoff}</span>
          {project.lastChecked && <><span aria-hidden="true">·</span><span>Last checked {project.lastChecked}</span></>}
          {project.hasResults && <Link href={`/projects/${project.id}/results`} className="underline underline-offset-4 decoration-line-strong hover:text-ink">View last results</Link>}
        </div>
        <h1 className="font-display text-[40px] leading-[1.05] font-semibold tracking-[-0.035em]">{project.name}</h1>
        {mode.provider === "demo" && (
          <p className="self-start text-[12.5px] px-2.5 py-1 rounded-full bg-med-soft text-med font-medium">Demo mode · no model key set</p>
        )}
      </header>

      {!steps ? (
        <>
          <section className="flex flex-col gap-3">
            <Eyebrow>Baseline</Eyebrow>
            <div className="flex flex-wrap items-center gap-4 p-5 rounded-2xl bg-ink text-bg">
              <span className="w-11 h-11 rounded-xl inline-flex items-center justify-center shrink-0 ring-1 ring-white/15 bg-white/5"><FileCheck2 size={20} aria-hidden="true" /></span>
              <div className="flex-1 min-w-[200px]">
                <div className="font-medium">{sow?.fileName ?? "No SOW"}</div>
                <div className="text-[12.5px] opacity-70">Signed SOW · uploaded {project.created} · {sow?.charCount.toLocaleString()} characters</div>
              </div>
              <span className="font-mono text-[11px] px-2.5 py-1 rounded-full ring-1 ring-white/20 opacity-80">LOCKED</span>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Eyebrow>Check against it</Eyebrow>
              <span className="text-[12.5px] text-faint">PDF, DOCX or TXT · 10 MB per file</span>
            </div>
            <ul className="flex flex-col gap-2.5">
              {rows.map((r) => (
                <li key={r.key} className="pop rounded-2xl bg-surface ring-1 ring-line hover:ring-line-strong hover:shadow-soft transition p-3 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div role="radiogroup" aria-label="Document type" className="flex flex-wrap gap-0.5 p-1 rounded-xl bg-sunken">
                      {DOC_TYPES.map((tp) => {
                        const Icon = DOC_ICON[tp];
                        return (
                          <button key={tp} type="button" role="radio" aria-checked={r.type === tp} onClick={() => setType(r, tp)}
                            className={cx("inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium transition cursor-pointer", r.type === tp ? "bg-surface text-ink shadow-soft ring-1 ring-line" : "text-muted hover:text-ink")}>
                            <Icon size={14} aria-hidden={true} />{tp}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex-1 min-w-[180px] flex items-center gap-2.5">
                      {r.state === "ready" && (<><FileText size={16} className="text-muted shrink-0" aria-hidden="true" /><span className="text-[13.5px] font-medium truncate">{r.file}</span><CheckCircle2 size={15} className="text-ok shrink-0" aria-label="Text extracted" /></>)}
                      {r.state === "uploading" && (<><Loader2 size={16} className="animate-spin text-accent shrink-0" aria-hidden="true" /><span className="text-[13.5px] text-muted truncate">Extracting text from {r.file}…</span></>)}
                      {(r.state === "empty" || r.state === "error") && <div className="w-full max-w-[260px]"><FileDrop id={`doc-${r.key}`} compact label="Choose file" onFile={(f) => upload(r.key, r.type, f)} invalid={r.state === "error"} /></div>}
                    </div>
                    <Btn variant="quiet" size="icon" className="hover:!bg-high-soft hover:!text-high" title="Delete document" aria-label={`Delete ${r.file ?? "document"}`} onClick={() => remove(r)}>
                      <Trash2 size={16} aria-hidden="true" />
                    </Btn>
                  </div>
                  {r.err && (
                    <div role="alert" className="flex gap-2.5 items-start p-3 rounded-xl bg-high-soft text-high text-[13px]">
                      <AlertCircle size={15} className="shrink-0 mt-0.5" aria-hidden="true" />{r.err}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <div className="grid gap-2.5 sm:grid-cols-[1fr_auto]">
              <button type="button" onClick={() => addRow()} className="h-12 rounded-2xl border-[1.5px] border-dashed border-line-strong text-muted hover:text-ink hover:border-accent hover:bg-accent-soft font-medium inline-flex items-center justify-center gap-2 transition cursor-pointer">
                <Plus size={16} aria-hidden="true" />Add document
              </button>
              {rows.length === 0 && <Btn variant="ghost" className="h-12 rounded-2xl" onClick={addSamples}>Use sample documents</Btn>}
            </div>
          </section>

          {runError && (
            <div role="alert" className="flex gap-2.5 items-start p-4 rounded-2xl bg-high-soft text-high text-[13.5px]">
              <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
              <span className="flex-1">{runError}</span>
              <button onClick={() => setRunError("")} aria-label="Dismiss error" className="cursor-pointer"><X size={15} aria-hidden="true" /></button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-surface ring-1 ring-line">
            <div>
              <div className="font-medium">{ready.length ? `${ready.length} ${ready.length === 1 ? "document" : "documents"} ready` : "Add at least one document"}</div>
              <div className="text-[12.5px] text-faint">
                {mode.provider === "demo"
                  ? "Demo mode: canned findings for the sample documents. Add an API key in .env.local for real comparisons."
                  : `One comparison per document with ${mode.model}. Every quote is checked word for word.`}
              </div>
            </div>
            <Btn variant="accent" size="lg" onClick={compare} disabled={!ready.length || rows.some((r) => r.state === "uploading")}>
              Let’s compare<ArrowRight size={16} aria-hidden="true" />
            </Btn>
          </div>
        </>
      ) : (
        <section className="pop rounded-3xl bg-surface ring-1 ring-line p-8 flex flex-col gap-7" aria-live="polite">
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-[26px] font-semibold tracking-tight">Picking out the drift</h2>
              <span className="tnum font-mono text-[13px] text-muted">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-sunken overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Comparison progress">
              <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${Math.max(pct, 4)}%` }} />
            </div>
          </div>
          <ol className="flex flex-col">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3.5 py-2.5">
                <span className="w-6 h-6 inline-flex items-center justify-center shrink-0">
                  {s.state === "done" ? <span className="w-[22px] h-[22px] rounded-full bg-ink text-bg inline-flex items-center justify-center pop"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>
                    : s.state === "active" ? <Loader2 size={20} className="animate-spin text-accent" aria-hidden="true" />
                    : s.state === "failed" ? <AlertCircle size={20} className="text-high" aria-hidden="true" />
                    : <span className="w-2 h-2 rounded-full bg-line-strong" />}
                </span>
                <span className="flex flex-col">
                  <span className={cx("text-[14.5px]", s.state === "pending" ? "text-faint" : "text-ink", s.state === "active" && "font-medium")}>{s.label}</span>
                  {s.message && <span className="text-[12.5px] text-high">{s.message}</span>}
                </span>
              </li>
            ))}
          </ol>
          <p className="text-[12.5px] text-faint">Usually under two minutes for an SOW and three documents.</p>
        </section>
      )}
    </div>
  );
}
