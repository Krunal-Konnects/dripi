"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, FileCheck2, Plus, ScanSearch, Search } from "lucide-react";
import { SowDialog } from "./sow-dialog";
import { Eyebrow, Mark } from "./ui";

type P = { id: string; code: string; name: string; created: string; checked: string; signoff: string; stakeCount: number; sowName: string; sowUpdated: string };

export function ProjectsView({ projects }: { projects: P[] }) {
  const [q, setQ] = useState("");
  const [sowFor, setSowFor] = useState<P | null>(null);
  const list = projects.filter((p) => (p.name + p.code).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="rise flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Eyebrow>Projects</Eyebrow>
          <h1 className="font-display text-[40px] leading-[1.05] font-semibold tracking-[-0.035em]">Your projects</h1>
        </div>
        <Link href="/projects/new" className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-ink text-bg text-sm font-medium hover:opacity-90 transition">
          <Plus size={16} aria-hidden="true" />New project
        </Link>
      </header>

      {projects.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line-strong py-20 px-6 flex flex-col items-center text-center gap-4">
          <Mark size={44} />
          <h2 className="font-display text-[26px] font-semibold tracking-tight">No projects yet</h2>
          <p className="text-muted max-w-[380px]">Create a project with its signed SOW. Then add PRDs, compliance notes, meeting notes or emails to check against it.</p>
          <Link href="/projects/new" className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-ink text-bg text-sm font-medium hover:opacity-90 transition">
            <Plus size={16} aria-hidden="true" />Create your first project
          </Link>
        </div>
      ) : (
        <section className="rounded-2xl bg-surface ring-1 ring-line overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
            <h2 className="text-[14px] font-semibold">All projects <span className="text-faint font-normal tnum">· {list.length}</span></h2>
            <div className="relative w-full sm:w-[260px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
              <input id="proj-q" aria-label="Filter projects" className="fld h-9 pl-9 text-[13.5px]" placeholder="Filter by name or ID" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-[14px]">
              <thead>
                <tr className="text-left text-[12.5px] text-faint">
                  <th className="font-medium px-5 py-3">ID</th>
                  <th className="font-medium px-3 py-3">Project</th>
                  <th className="font-medium px-3 py-3">SOW</th>
                  <th className="font-medium px-3 py-3">Created</th>
                  <th className="font-medium px-3 py-3">Last checked</th>
                  <th className="font-medium px-5 py-3 text-right">Scope check</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-t border-line hover:bg-sunken transition-colors">
                    <td className="px-5 py-4 font-mono text-[13px] text-muted">{p.code}</td>
                    <td className="px-3 py-4">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-[12.5px] text-faint">Sign-off {p.signoff} · {p.stakeCount} {p.stakeCount === 1 ? "stakeholder" : "stakeholders"}</div>
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => setSowFor(p)} aria-label={`View or replace the SOW for ${p.name}`}
                        className="group flex items-center gap-2.5 max-w-[230px] text-left rounded-lg px-2 py-1.5 -mx-2 hover:bg-surface hover:ring-1 hover:ring-line-strong transition cursor-pointer">
                        <FileCheck2 size={16} className="text-muted shrink-0" aria-hidden="true" />
                        <span className="flex flex-col min-w-0">
                          <span className="text-[13px] font-medium truncate">{p.sowName || "No SOW"}</span>
                          <span className="text-[12px] text-faint">Updated {p.sowUpdated}</span>
                        </span>
                        <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-accent opacity-80 group-hover:opacity-100"><Eye size={13} aria-hidden="true" />View</span>
                      </button>
                    </td>
                    <td className="px-3 py-4 text-muted tnum">{p.created}</td>
                    <td className="px-3 py-4">
                      {p.checked ? <span className="text-muted tnum">{p.checked}</span> : <span className="text-[12px] px-2 py-1 rounded-md bg-sunken text-muted">Not run yet</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/projects/${p.id}/check`} aria-label={`Run scope check for ${p.name}`}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium border border-line-strong bg-surface hover:bg-ink hover:text-bg hover:border-ink transition">
                        <ScanSearch size={15} aria-hidden="true" />Scope check
                      </Link>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-muted">No projects match “{q}”.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {sowFor && <SowDialog project={sowFor} onClose={() => setSowFor(null)} />}
    </div>
  );
}
