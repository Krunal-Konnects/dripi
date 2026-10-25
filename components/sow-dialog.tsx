"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, FileCheck2, Info, Loader2, RefreshCw, Search, X } from "lucide-react";
import { api, extractFile } from "@/lib/client";
import { fmtTs } from "@/lib/constants";
import { Portal } from "./portal";
import { useToast } from "./toast";
import { Btn, Eyebrow, Hi } from "./ui";

type Sow = { fileName: string; text: string; charCount: number; uploadedAt: number };

/** View a project's signed SOW and replace it with a new upload. */
export function SowDialog({ project, onClose }: { project: { id: string; code: string; name: string }; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [sow, setSow] = useState<Sow | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [replaced, setReplaced] = useState(false);
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<Sow>(`/api/projects/${project.id}/sow`).then(setSow).catch((e) => setLoadError((e as Error).message));
  }, [project.id]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [busy, onClose]);

  const replace = async (f: File) => {
    setBusy(true);
    setError("");
    try {
      const ex = await extractFile(f);
      const saved = await api<Omit<Sow, "text">>(`/api/projects/${project.id}/sow`, { method: "PUT", json: { fileName: ex.fileName, text: ex.text } });
      setSow({ ...saved, text: ex.text });
      setReplaced(true);
      toast(`SOW replaced for ${project.code}. Run a new scope check to compare against it.`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const paragraphs = (sow?.text ?? "").split(/\n{2,}/);
  const matches = q.trim() ? (sow?.text.toLowerCase().split(q.trim().toLowerCase()).length ?? 1) - 1 : 0;

  return (
    <Portal>
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="fadein absolute inset-0 bg-black/35 backdrop-blur-[2px]" onClick={() => !busy && onClose()} aria-hidden="true" />
      <section role="dialog" aria-modal="true" aria-labelledby="sow-title" className="pop relative w-full max-w-[760px] max-h-[90vh] flex flex-col rounded-3xl bg-surface ring-1 ring-line shadow-soft overflow-hidden">
        <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-line">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-ink text-bg inline-flex items-center justify-center shrink-0"><FileCheck2 size={18} aria-hidden="true" /></span>
            <div className="flex flex-col gap-0.5 min-w-0">
              <Eyebrow>Signed SOW · {project.code}</Eyebrow>
              <h2 id="sow-title" className="font-display text-[22px] leading-tight font-semibold tracking-tight truncate">{project.name}</h2>
              {sow && (
                <span className="text-[12.5px] text-muted truncate">
                  {sow.fileName} · {sow.charCount.toLocaleString()} characters · {replaced ? "replaced" : "uploaded"} {fmtTs(sow.uploadedAt)}
                </span>
              )}
            </div>
          </div>
          <Btn variant="quiet" size="icon" onClick={onClose} aria-label="Close" disabled={busy}><X size={17} aria-hidden="true" /></Btn>
        </header>

        {sow && (
          <div className="px-6 pt-4">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
              <input id="sow-q" aria-label="Find in SOW" className="fld h-9 pl-9 pr-24 text-[13.5px]" placeholder="Find in SOW" value={q} onChange={(e) => setQ(e.target.value)} />
              {q.trim() && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-faint tnum">{matches} {matches === 1 ? "match" : "matches"}</span>}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!sow && !loadError && <p className="flex items-center gap-2 text-muted text-[13.5px]"><Loader2 size={15} className="animate-spin" aria-hidden="true" />Loading the SOW…</p>}
          {loadError && <p role="alert" className="text-high text-[13.5px]">{loadError}</p>}
          {sow && (
            <article className="rounded-2xl bg-sunken ring-1 ring-line p-5 flex flex-col gap-3 text-[14px] leading-relaxed">
              {paragraphs.map((p, i) => (
                <p key={i} className="m-0 whitespace-pre-wrap">{q.trim() ? <HighlightAll text={p} term={q.trim()} /> : p}</p>
              ))}
            </article>
          )}
        </div>

        {error && (
          <div role="alert" className="mx-6 mb-3 flex gap-2.5 items-start p-3 rounded-xl bg-high-soft text-high text-[13px]">
            <AlertCircle size={15} className="shrink-0 mt-0.5" aria-hidden="true" /><span>{error}</span>
          </div>
        )}
        <footer className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-line bg-sunken">
          <span className="text-[12.5px] text-faint flex items-center gap-1.5 max-w-[420px]">
            <Info size={13} className="shrink-0" aria-hidden="true" />
            Replacing keeps past results. The next scope check compares against the new SOW.
          </span>
          <div className="flex gap-2">
            <input ref={input} id="sow-replace" type="file" className="sr-only" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) replace(f); e.target.value = ""; }} />
            <Btn variant="ghost" onClick={onClose} disabled={busy}>Close</Btn>
            <Btn onClick={() => input.current?.click()} disabled={busy || !sow}>
              {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={15} aria-hidden="true" />}
              {busy ? "Extracting text…" : "Replace SOW"}
            </Btn>
          </div>
        </footer>
      </section>
    </div>
    </Portal>
  );
}

function HighlightAll({ text, term }: { text: string; term: string }) {
  const lower = text.toLowerCase();
  const t = term.toLowerCase();
  const out: React.ReactNode[] = [];
  let i = 0;
  for (;;) {
    const j = lower.indexOf(t, i);
    if (j < 0) { out.push(text.slice(i)); break; }
    out.push(text.slice(i, j));
    out.push(<Hi key={j} text={text.slice(j, j + term.length)} mark={text.slice(j, j + term.length)} />);
    i = j + term.length;
  }
  return <>{out}</>;
}
