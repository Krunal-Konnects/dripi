"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { api } from "@/lib/client";
import { DECISION_OUTCOMES, DECISION_STATUSES } from "@/lib/constants";
import { useToast } from "./toast";
import { Eyebrow, Select, cx } from "./ui";

export type DecisionDTO = {
  id: string; code: string; question: string; projectCode: string; projectName: string; ownerName: string; ownerTeam: string;
  sent: string; status: string; outcome: string; sowQuote: string; otherQuote: string; docType: string; deliveryStatus: string; replyBy: string;
};

const DOT: Record<string, string> = { Open: "var(--accent)", Answered: "var(--ok)", Ignored: "var(--faint)", Overdue: "var(--high-dot)" };
const DELIVERY: Record<string, string> = { simulated: "Simulated send", sent: "Sent", delivered: "Delivered", bounced: "Bounced", complained: "Marked as spam" };

export function DecisionsView({ initial, fresh }: { initial: DecisionDTO[]; fresh?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<string>("All");
  const [open, setOpen] = useState<string | null>(null);
  const c = (s: string) => rows.filter((d) => d.status === s).length;
  const list = rows.filter((d) => tab === "All" || d.status === tab);
  const rework = rows.filter((d) => d.outcome === "Caused rework").length;

  const upd = async (id: string, patch: Partial<DecisionDTO>) => {
    const prev = rows;
    setRows((rs) => rs.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    try {
      await api(`/api/decisions/${id}`, { method: "PATCH", json: patch });
      router.refresh();
    } catch (e) {
      setRows(prev);
      toast((e as Error).message);
    }
  };

  return (
    <div className="rise flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <Eyebrow>Decision ledger</Eyebrow>
        <h1 className="font-display text-[40px] leading-[1.05] font-semibold tracking-[-0.035em]">Decisions</h1>
      </header>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <div className="rounded-2xl bg-surface ring-1 ring-line p-5"><div className="text-[13px] text-muted">Sent</div><div className="tnum font-display text-[34px] font-semibold leading-tight">{rows.length}</div></div>
        <div className="rounded-2xl bg-surface ring-1 ring-line p-5"><div className="text-[13px] text-muted">Answered</div><div className="tnum font-display text-[34px] font-semibold leading-tight">{c("Answered")}</div></div>
        <div className="rounded-2xl bg-ink text-bg p-5"><div className="text-[13px] opacity-70">Caused rework</div><div className="tnum font-display text-[34px] font-semibold leading-tight">{rework}</div></div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line-strong py-16 px-6 flex flex-col items-center text-center gap-3">
          <h2 className="font-display text-[26px] font-semibold tracking-tight">No decisions sent yet</h2>
          <p className="text-muted max-w-[380px]">Run a scope check and notify a stakeholder about a conflict. It will be tracked here.</p>
        </div>
      ) : (
        <section className="rounded-2xl bg-surface ring-1 ring-line overflow-hidden">
          <div role="tablist" aria-label="Filter decisions by status" className="flex gap-1 p-2 border-b border-line overflow-x-auto">
            {["All", ...DECISION_STATUSES].map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                className={cx("h-8 px-3 rounded-lg text-[13px] font-medium inline-flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer", tab === t ? "bg-ink text-bg" : "text-muted hover:bg-sunken hover:text-ink")}>
                {t}<span className="tnum font-mono text-[11px] opacity-70">{t === "All" ? rows.length : c(t)}</span>
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1060px] text-[14px]">
              <thead>
                <tr className="text-left text-[12.5px] text-faint">
                  <th className="font-medium px-5 py-3 whitespace-nowrap">Decision ID</th>
                  <th className="font-medium px-3 py-3">Decision</th>
                  <th className="font-medium px-3 py-3">Project</th>
                  <th className="font-medium px-3 py-3">Owner</th>
                  <th className="font-medium px-3 py-3">Sent</th>
                  <th className="font-medium px-3 py-3">Status</th>
                  <th className="font-medium px-5 py-3 pl-3">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-muted border-t border-line">No {tab.toLowerCase()} decisions.</td></tr>}
                {list.map((d) => {
                  const ex = open === d.id;
                  return (
                    <Fragment key={d.id}>
                      <tr className={cx("border-t border-line align-top transition-colors", d.code === fresh ? "bg-accent-soft" : "hover:bg-sunken")}>
                        <td className="px-5 py-4 font-mono text-[12.5px] text-muted whitespace-nowrap">{d.code}</td>
                        <td className="px-3 py-4 max-w-[340px]">
                          <button onClick={() => setOpen(ex ? null : d.id)} aria-expanded={ex} aria-controls={`dx-${d.id}`} className="group flex items-start gap-2.5 text-left cursor-pointer">
                            <ChevronRight size={16} aria-hidden="true" className={cx("mt-0.5 text-faint shrink-0 transition-transform duration-200", ex && "rotate-90")} />
                            <span className="flex flex-col gap-1">
                              <span className="font-medium group-hover:underline underline-offset-4 decoration-line-strong">{d.question}</span>
                              {(d.deliveryStatus === "bounced" || d.deliveryStatus === "complained") && (
                                <span className="inline-flex items-center gap-1 text-[12px] text-high"><AlertTriangle size={12} aria-hidden="true" />{DELIVERY[d.deliveryStatus]}: check the address and resend</span>
                              )}
                            </span>
                          </button>
                        </td>
                        <td className="px-3 py-4"><div className="flex flex-col gap-0.5"><span className="font-mono text-[12px] text-muted">{d.projectCode}</span><span className="whitespace-nowrap">{d.projectName}</span></div></td>
                        <td className="px-3 py-4"><div className="flex flex-col gap-0.5"><span className="whitespace-nowrap">{d.ownerName}</span><span className="text-[12.5px] text-faint">{d.ownerTeam}</span></div></td>
                        <td className="px-3 py-4 text-muted tnum whitespace-nowrap">{d.sent}</td>
                        <td className="px-3 py-3">
                          <div className="relative w-[140px]">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none z-10" style={{ background: DOT[d.status] }} />
                            <Select id={`ds-${d.id}`} aria-label={`Status for ${d.code}`} value={d.status} onChange={(e) => upd(d.id, { status: e.target.value })} selectClassName="!pl-7 !h-9 text-[13px]">
                              {DECISION_STATUSES.map((s) => <option key={s}>{s}</option>)}
                            </Select>
                          </div>
                        </td>
                        <td className="pr-5 pl-3 py-3">
                          <Select id={`do-${d.id}`} aria-label={`Outcome for ${d.code}`} value={d.outcome} onChange={(e) => upd(d.id, { outcome: e.target.value })} className="w-[160px]" selectClassName="!h-9 text-[13px]">
                            {DECISION_OUTCOMES.map((s) => <option key={s}>{s}</option>)}
                          </Select>
                        </td>
                      </tr>
                      {ex && (
                        <tr id={`dx-${d.id}`}>
                          <td colSpan={7} className="px-5 pb-5 pl-12">
                            <div className="pop grid gap-3 md:grid-cols-2">
                              <figure className="m-0 rounded-xl bg-sunken ring-1 ring-line p-4"><figcaption className="font-mono text-[11px] tracking-[0.08em] uppercase text-muted mb-2">Signed SOW</figcaption><blockquote className="m-0 text-[14px]">“{d.sowQuote}”</blockquote></figure>
                              <figure className="m-0 rounded-xl bg-surface ring-1 ring-line p-4"><figcaption className="font-mono text-[11px] tracking-[0.08em] uppercase text-muted mb-2">{d.docType}</figcaption><blockquote className="m-0 text-[14px]">“{d.otherQuote}”</blockquote></figure>
                            </div>
                            <p className="mt-3 text-[12.5px] text-faint">Reply by {d.replyBy} · Delivery: {DELIVERY[d.deliveryStatus] ?? d.deliveryStatus}</p>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
