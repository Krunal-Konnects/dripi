"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Eye, FileCheck2, Loader2, Plus, RefreshCw, ScanSearch, Trash2, Undo2, Users } from "lucide-react";
import { api, ApiError, extractFile } from "@/lib/client";
import { TEAMS } from "@/lib/constants";
import { SowDialog } from "./sow-dialog";
import { useToast } from "./toast";
import { Btn, Eyebrow, Field, Select, cx } from "./ui";

type Stake = { id?: string; key: string; team: string; name: string; email: string };
type Sow = { fileName: string; charCount: number; updated: string } | null;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let n = 0;
const key = () => `k${++n}`;

export function EditProjectForm({ project, sow: initialSow, stakeholders }: {
  project: { id: string; code: string; name: string; signoffDate: string };
  sow: Sow;
  stakeholders: { id: string; team: string; name: string; email: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const initial = useMemo(() => ({ name: project.name, date: project.signoffDate, stakes: stakeholders.map((s) => ({ ...s, key: s.id })) }), [project, stakeholders]);
  const [base, setBase] = useState(initial);
  const [name, setName] = useState(initial.name);
  const [date, setDate] = useState(initial.date);
  const [stakes, setStakes] = useState<Stake[]>(initial.stakes);
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sow, setSow] = useState<Sow>(initialSow);
  const [sowBusy, setSowBusy] = useState(false);
  const [sowErr, setSowErr] = useState("");
  const [viewSow, setViewSow] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const snapshot = (nm: string, d: string, s: Stake[]) => JSON.stringify([nm.trim(), d, s.map(({ id, team, name, email }) => [id ?? null, team, name.trim(), email.trim()])]);
  const dirty = snapshot(name, date, stakes) !== snapshot(base.name, base.date, base.stakes);
  const removedCount = base.stakes.filter((b) => !stakes.some((s) => s.id === b.id)).length;

  const upd = (k: string, field: "team" | "name" | "email", v: string) => setStakes((ss) => ss.map((s) => (s.key === k ? { ...s, [field]: v } : s)));
  const remove = (k: string) => setStakes((ss) => ss.filter((s) => s.key !== k));
  const add = () => setStakes((ss) => [...ss, { key: key(), team: "FE lead", name: "", email: "" }]);
  const discard = () => { setName(base.name); setDate(base.date); setStakes(base.stakes); setErr({}); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!name.trim()) er.name = "Give the project a name.";
    if (!date) er.date = "Add the SOW sign-off date.";
    const filled = stakes.filter((s) => s.name.trim() || s.email.trim());
    if (!filled.length) er.stake = "Keep at least one stakeholder.";
    else if (filled.some((s) => !s.name.trim() || !EMAIL.test(s.email.trim()))) er.stake = "Every stakeholder needs a name and a valid email.";
    setErr(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const res = await api<{ stakeholders: { id: string; team: string; name: string; email: string }[] }>(`/api/projects/${project.id}`, {
        method: "PATCH",
        json: { name, signoffDate: date, stakeholders: filled.map(({ id, team, name, email }) => ({ id, team, name, email })) },
      });
      const fresh = res.stakeholders.map((s) => ({ ...s, key: s.id }));
      setStakes(fresh);
      setBase({ name: name.trim(), date, stakes: fresh });
      setName(name.trim());
      toast("Changes saved");
      router.refresh();
    } catch (e) {
      const a = e as ApiError;
      setErr(a.fields ?? { form: a.message });
    } finally {
      setBusy(false);
    }
  };

  const replaceSow = async (f: File) => {
    setSowBusy(true);
    setSowErr("");
    try {
      const ex = await extractFile(f);
      const saved = await api<{ fileName: string; charCount: number }>(`/api/projects/${project.id}/sow`, { method: "PUT", json: { fileName: ex.fileName, text: ex.text } });
      setSow({ fileName: saved.fileName, charCount: saved.charCount, updated: "just now" });
      toast("SOW replaced. Run a new scope check to compare against it.");
      router.refresh();
    } catch (e) {
      setSowErr((e as Error).message);
    } finally {
      setSowBusy(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="rise flex flex-col gap-8 max-w-[960px] pb-16">
      <header className="flex flex-col gap-3">
        <Link href="/projects" className="self-start -ml-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium text-muted hover:bg-sunken hover:text-ink">
          <ArrowLeft size={15} aria-hidden="true" />Projects
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Eyebrow>Edit project · {project.code}</Eyebrow>
            <h1 className="font-display text-[40px] leading-[1.05] font-semibold tracking-[-0.035em]">{base.name}</h1>
          </div>
          <Link href={`/projects/${project.id}/check`} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] text-[13.5px] font-medium border border-line-strong bg-surface hover:bg-sunken">
            <ScanSearch size={15} aria-hidden="true" />Scope check
          </Link>
        </div>
      </header>

      <section className="rounded-2xl bg-surface ring-1 ring-line p-6 flex flex-col gap-5">
        <h2 className="text-[15px] font-semibold">Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="ep-name" label="Project name" error={err.name}>
            <input id="ep-name" className={cx("fld", err.name && "bad")} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field id="ep-date" label="SOW sign-off date" error={err.date} hint="Used as the reply-by date on new decision requests.">
            <input id="ep-date" type="date" className={cx("fld", err.date && "bad")} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl bg-surface ring-1 ring-line p-6 flex flex-col gap-4">
        <h2 className="text-[15px] font-semibold">Signed SOW</h2>
        <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl ring-1 ring-line bg-sunken">
          <span className="w-10 h-10 rounded-lg bg-ink text-bg inline-flex items-center justify-center shrink-0"><FileCheck2 size={18} aria-hidden="true" /></span>
          <div className="flex-1 min-w-[200px] flex flex-col">
            <span className="font-medium truncate">{sow?.fileName ?? "No SOW uploaded"}</span>
            {sow && <span className="text-[12.5px] text-faint">{sow.charCount.toLocaleString()} characters · updated {sow.updated}</span>}
          </div>
          <input ref={fileInput} id="ep-sow" type="file" className="sr-only" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) replaceSow(f); e.target.value = ""; }} />
          <div className="flex gap-2">
            <Btn type="button" variant="ghost" size="sm" onClick={() => setViewSow(true)} disabled={!sow || sowBusy}><Eye size={14} aria-hidden="true" />View</Btn>
            <Btn type="button" variant="ghost" size="sm" onClick={() => fileInput.current?.click()} disabled={sowBusy}>
              {sowBusy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />}
              {sowBusy ? "Extracting text…" : "Replace"}
            </Btn>
          </div>
        </div>
        {sowErr && <p role="alert" className="text-[12.5px] text-high flex gap-1.5 items-start"><AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />{sowErr}</p>}
        <p className="text-[12.5px] text-faint">Replacing the SOW saves straight away. Past results are kept; the next scope check compares against the new SOW.</p>
      </section>

      <section className="rounded-2xl bg-surface ring-1 ring-line p-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-semibold inline-flex items-center gap-2"><Users size={16} aria-hidden="true" />Stakeholders <span className="text-faint font-normal tnum">· {stakes.length}</span></h2>
          <span className="text-[12.5px] text-faint">They get decision requests by email. They never log in.</span>
        </div>
        <ul className="flex flex-col gap-3">
          {stakes.map((s, i) => (
            <li key={s.key} className="pop grid gap-3 md:grid-cols-[200px_minmax(0,1fr)_minmax(0,1.2fr)_auto] items-end">
              <Field id={`es-t-${s.key}`} label="Team" labelClassName={i > 0 ? "md:sr-only" : ""}>
                <Select id={`es-t-${s.key}`} value={s.team} onChange={(e) => upd(s.key, "team", e.target.value)}>
                  {TEAMS.map((t) => <option key={t}>{t}</option>)}
                </Select>
              </Field>
              <Field id={`es-n-${s.key}`} label="Name" labelClassName={i > 0 ? "md:sr-only" : ""}>
                <div className="relative">
                  <input id={`es-n-${s.key}`} className={cx("fld", !s.id && "pr-14")} placeholder="Full name" value={s.name} onChange={(e) => upd(s.key, "name", e.target.value)} />
                  {!s.id && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold px-1.5 py-0.5 rounded bg-accent-soft text-accent">New</span>}
                </div>
              </Field>
              <Field id={`es-e-${s.key}`} label="Email" labelClassName={i > 0 ? "md:sr-only" : ""}>
                <input id={`es-e-${s.key}`} type="email" className="fld" placeholder="name@company.com" value={s.email} onChange={(e) => upd(s.key, "email", e.target.value)} />
              </Field>
              <Btn type="button" variant="quiet" size="icon" className="h-[42px] w-[42px] hover:!bg-high-soft hover:!text-high" aria-label={`Remove ${s.name || "stakeholder"}`} title="Remove stakeholder" onClick={() => remove(s.key)}>
                <Trash2 size={16} aria-hidden="true" />
              </Btn>
            </li>
          ))}
        </ul>
        {stakes.length === 0 && <p className="text-[13.5px] text-muted">No stakeholders. Add at least one before saving.</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Btn type="button" variant="ghost" size="sm" onClick={add}><Plus size={15} aria-hidden="true" />Add stakeholder</Btn>
          {err.stake && <span className="text-[12.5px] text-high" role="alert">{err.stake}</span>}
        </div>
        {removedCount > 0 && (
          <p className="text-[12.5px] text-med bg-med-soft rounded-lg px-3 py-2">
            {removedCount} {removedCount === 1 ? "stakeholder" : "stakeholders"} will be removed when you save. Open conflicts assigned to them will need a new recipient. Past decisions keep their owner.
          </p>
        )}
      </section>

      <div className={cx("sticky bottom-4 z-10 rounded-2xl ring-1 p-4 flex flex-wrap items-center justify-between gap-3 transition shadow-soft", dirty ? "bg-ink text-bg ring-ink" : "bg-surface ring-line")}>
        <span className={cx("text-[13.5px]", dirty ? "" : "text-muted")}>{err.form ? <span className="text-high">{err.form}</span> : dirty ? "You have unsaved changes." : "All changes saved."}</span>
        <div className="flex gap-2">
          <Btn type="button" variant={dirty ? "quiet" : "ghost"} className={dirty ? "!text-bg hover:!bg-white/10" : ""} onClick={discard} disabled={!dirty || busy}><Undo2 size={15} aria-hidden="true" />Discard</Btn>
          <Btn type="submit" variant={dirty ? "accent" : "primary"} disabled={!dirty || busy}>{busy && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}Save changes</Btn>
        </div>
      </div>

      {viewSow && <SowDialog project={{ id: project.id, code: project.code, name: base.name }} onClose={() => setViewSow(false)} />}
    </form>
  );
}
