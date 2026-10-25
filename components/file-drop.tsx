"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cx } from "./ui";

/** A drop zone + hidden file input. Calls onFile with the chosen file. */
export function FileDrop({ onFile, invalid, label = "Drop the signed SOW, or choose a file", compact = false, id }: {
  onFile: (f: File) => void;
  invalid?: boolean;
  label?: string;
  compact?: boolean;
  id: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <>
      <input ref={input} id={id} type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      <button type="button" onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
        className={cx("group w-full rounded-2xl border-[1.5px] border-dashed flex items-center transition hover:border-accent hover:bg-accent-soft cursor-pointer",
          compact ? "h-12 justify-center gap-2 text-[14px] font-medium text-muted hover:text-ink" : "py-10 px-6 flex-col gap-3",
          over && "border-accent bg-accent-soft", invalid ? "border-high" : "border-line-strong")}>
        {compact ? (<><Upload size={15} aria-hidden="true" />{label}</>) : (
          <>
            <span className="w-11 h-11 rounded-xl bg-surface ring-1 ring-line inline-flex items-center justify-center transition group-hover:-translate-y-0.5"><Upload size={19} aria-hidden="true" /></span>
            <span className="font-medium">{label}</span>
            <span className="text-[12.5px] text-faint">PDF, DOCX or TXT · up to 10 MB</span>
          </>
        )}
      </button>
    </>
  );
}

/** Fetch a bundled sample file and hand it over as a File. */
export async function sampleFile(path: string, name: string): Promise<File> {
  const res = await fetch(path);
  const blob = await res.blob();
  return new File([blob], name, { type: "text/plain" });
}
