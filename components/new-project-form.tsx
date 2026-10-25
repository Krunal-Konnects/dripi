"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Check, CheckCircle2, FileText, Loader2, Lock, Plus, Trash2 } from "lucide-react";
import { api, ApiError, extractFile, type Extracted } from "@/lib/client";
import { TEAMS } from "@/lib/constants";
import { FileDrop, sampleFile } from "./file-drop";
import { useToast } from "./toast";
import { Btn, Field, Select, cx } from "./ui";

type Stake = { team: string; name: string; email: string };
const blank = (team = "FE lead"): Stake => ({ team, name: "", email: "" });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewProjectForm() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [stakes, setStakes] = useState<Stake[]>([blank()]);
  const [sow, setSow] = useState<{ state: "empty" | "uploading" | "ready" | "error"; file?: string; data?: Extracted; err?: string }>({ state: "empty" });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const upd = (i: number, k: keyof Stake, v: string) => setStakes(stakes.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  const validStake = stakes.some((s) => s.name.trim() && EMAIL.test(s.email));
  const checks = [
    { k: "Project name", ok: !!name.trim() },
    { k: "Sign-off date", ok: !!date },
    { k: "At least one stakeholder", ok: validStake },
    { k: "Signed SOW uploaded", ok: sow.state === "ready" },
  ];

  const upload = async (f: File) => {
    setSow({ state: "uploading", file: f.name });
    try {
      const data = await extractFile(f);
      setSow({ state: "ready", file: data.fileName, data });
      setErr((e) => ({ ...e, sow: "" }));
    } catch (e) {
      setSow({ state: "error", file: f.name, err: (e as Error).message });
    }
  };

  const useSample = async () => {
    setName("Clinic Portal v2");
    const d = new Date(Date.now() + 18 * 864e5);
    setDate(d.toISOString().slice(0, 10));
    setStakes([
      { team: "Sales", name: "Priya Shah", email: "priya.shah@example.com" },
      { team: "DevOps", name: "Aman Rao", email: "aman.rao@example.com" },
      { team: "FE lead", name: "Ananya Desai", email: "ananya.desai@example.com" },
      { team: "BE lead", name: "Vikram Joshi", email: "vikram.joshi@example.com" },
      { team: "Project Manager", name: "Rohan Mehta", email: "rohan.mehta@example.com" },
      { team: "Upper management", name: "Meera Iyer", email: "meera.iyer@example.com" },
    ]);
    await upload(await sampleFile("/samples/SOW_Clinic-Portal_signed.txt", "SOW_Clinic-Portal_signed.txt"));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!name.trim()) er.name = "Give the project a name.";
    if (!date) er.date = "Add the SOW sign-off date.";
    if (!validStake) er.stake = "Add at least one stakeholder with a name and a valid email.";
    if (sow.state !== "ready") er.sow = sow.err || "Upload the signed SOW.";
    setErr(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const res = await api<{ id: string; code: string }>("/api/projects", {
        method: "POST",
        json: { name, signoffDate: date, stakeholders: stakes.filter((s) => s.name.trim()), sow: { fileName: sow.data!.fileName, text: sow.data!.text } },
      });
      toast(`Project ${res.code} created`);
      router.push("/projects");
      router.refresh();
    } catch (e) {
      const a = e as ApiError;
      setErr(a.fields ?? { form: a.message });
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="rise flex flex-col gap-8 max-w-[960px]">
      <header className="flex flex-col gap-3">
        <Link href="/projects" className="self-start -ml-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium text-muted hover:bg-sunken hover:text-ink">
          <ArrowLeft size={15} aria-hidden="true" />Projects
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-[40px] leading-[1.05] font-semibold tracking-[-0.035em]">New project</h1>
          <Btn type="button" variant="ghost" size="sm" onClick={useSample}>Fill with sample project</Btn>
        </div>
        <p className="text-muted max-w-[560px]">The signed SOW is the baseline. Every other document gets checked against it.</p>
      </header>

      <section className="rounded-2xl bg-surface ring-1 ring-line p-6 flex flex-col gap-5">
        <h2 className="text-[15px] font-semibold">Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="np-name" label="Project name" error={err.name}>
            <input id="np-name" className={cx("fld", err.name && "bad")} placeholder="e.g. Clinic Portal v2" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field id="np-date" label="SOW sign-off date" error={err.date} hint="Used as the reply-by date on decision requests.">
            <input id="np-date" type="date" className={cx("fld", err.date && "bad")} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl bg-surface ring-1 ring-line p-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-semibold">Stakeholders</h2>
          <span className="text-[12.5px] text-faint">They get decision requests by email. They never log in.</span>
        </div>
        <ul className="flex flex-col gap-3">
          {stakes.map((s, i) => (
            <li key={i} className="pop grid gap-3 md:grid-cols-[200px_minmax(0,1fr)_minmax(0,1.2fr)_auto] items-end">
              <Field id={`st-t-${i}`} label="Team" labelClassName={i > 0 ? "md:sr-only" : ""}>
                <Select id={`st-t-${i}`} value={s.team} onChange={(e) => upd(i, "team", e.target.value)}>
                  {TEAMS.map((t) => <option key={t}>{t}</option>)}
                </Select>
              </Field>
              <Field id={`st-n-${i}`} label="Name" labelClassName={i > 0 ? "md:sr-only" : ""}><input id={`st-n-${i}`} className="fld" placeholder="Full name" value={s.name} onChange={(e) => upd(i, "name", e.target.value)} /></Field>
              <Field id={`st-e-${i}`} label="Email" labelClassName={i > 0 ? "md:sr-only" : ""}><input id={`st-e-${i}`} type="email" className="fld" placeholder="name@company.com" value={s.email} onChange={(e) => upd(i, "email", e.target.value)} /></Field>
              <Btn type="button" variant="quiet" size="icon" className="h-[42px] w-[42px]" aria-label={`Remove stakeholder ${i + 1}`} onClick={() => setStakes(stakes.length > 1 ? stakes.filter((_, j) => j !== i) : [blank()])}>
                <Trash2 size={16} aria-hidden="true" />
              </Btn>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Btn type="button" variant="ghost" size="sm" onClick={() => setStakes([...stakes, blank("BE lead")])}><Plus size={15} aria-hidden="true" />Add stakeholder</Btn>
          {err.stake && <span className="text-[12.5px] text-high" role="alert">{err.stake}</span>}
        </div>
      </section>

      <section className="rounded-2xl bg-surface ring-1 ring-line p-6 flex flex-col gap-4">
        <h2 className="text-[15px] font-semibold">Signed SOW</h2>
        {sow.state === "empty" || sow.state === "error" ? (
          <FileDrop id="sow-file" onFile={upload} invalid={!!err.sow || sow.state === "error"} />
        ) : (
          <div className="pop flex items-center gap-4 p-4 rounded-xl ring-1 ring-line bg-sunken">
            <span className="w-10 h-10 rounded-lg bg-surface ring-1 ring-line inline-flex items-center justify-center shrink-0"><FileText size={18} aria-hidden="true" /></span>
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <span className="font-medium truncate">{sow.file}</span>
              {sow.state === "uploading" ? (
                <span className="text-[12.5px] text-muted flex items-center gap-1.5"><Loader2 size={14} className="animate-spin text-accent" aria-hidden="true" />Extracting text…</span>
              ) : (
                <span className="text-[12.5px] text-ok flex items-center gap-1.5"><CheckCircle2 size={14} aria-hidden="true" />Text extracted · {sow.data?.charCount.toLocaleString()} characters · original file discarded</span>
              )}
            </div>
            {sow.state === "ready" && <Btn type="button" variant="quiet" size="sm" onClick={() => setSow({ state: "empty" })}>Replace</Btn>}
          </div>
        )}
        {(sow.err || err.sow) && (
          <p className="text-[12.5px] text-high flex gap-1.5 items-start" role="alert"><AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />{sow.err || err.sow}</p>
        )}
        <p className="text-[12.5px] text-faint flex gap-2 items-center"><Lock size={13} aria-hidden="true" />Dripi keeps the extracted text only. The original file is never stored.</p>
      </section>

      <div className="rounded-2xl bg-surface ring-1 ring-line p-5 flex flex-wrap items-center justify-between gap-4">
        <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Ready to create">
          {checks.map((c) => (
            <li key={c.k} className="flex items-center gap-2 text-[13.5px]">
              <span className={cx("w-5 h-5 rounded-full inline-flex items-center justify-center transition", c.ok ? "bg-ok text-surface" : "ring-1 ring-line-strong")}>{c.ok && <Check size={12} strokeWidth={3} aria-hidden="true" />}</span>
              <span className={c.ok ? "text-ink" : "text-muted"}>{c.k}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 items-center">
          {err.form && <span className="text-[12.5px] text-high" role="alert">{err.form}</span>}
          <Link href="/projects" className="inline-flex items-center h-10 px-4 rounded-[10px] text-sm font-medium text-muted hover:bg-sunken hover:text-ink">Cancel</Link>
          <Btn type="submit" disabled={busy}>{busy && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}Create project</Btn>
        </div>
      </div>
    </form>
  );
}
