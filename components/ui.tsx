import type { ButtonHTMLAttributes, ReactNode } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

export function Mark({ size = 28 }: { size?: number }) {
  // A drop (the scope) with a small point drifting off its edge (the picked drift)
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M14 3.5c0 0-8.5 9.2-8.5 15.3a8.5 8.5 0 0 0 17 0C22.5 12.7 14 3.5 14 3.5z" fill="var(--ink)" />
      <circle cx="14" cy="19" r="3.1" fill="var(--bg)" />
      <circle cx="26.2" cy="9.6" r="2.6" fill="var(--accent)" />
    </svg>
  );
}

export function Logo({ size = 28, word = true }: { size?: number; word?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark size={size} />
      {word && (
        <span className="font-display font-semibold text-ink" style={{ fontSize: size * 0.78, letterSpacing: "-0.03em" }}>
          dripi
        </span>
      )}
    </span>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "accent" | "ghost" | "quiet";
  size?: "sm" | "md" | "lg" | "icon";
};
export function Btn({ variant = "primary", size = "md", className = "", children, ...p }: BtnProps) {
  const v = {
    primary: "bg-ink text-bg hover:opacity-90",
    accent: "bg-accent text-accent-ink hover:brightness-110",
    ghost: "bg-surface text-ink border border-line-strong hover:bg-sunken",
    quiet: "bg-transparent text-muted hover:bg-sunken hover:text-ink",
  }[variant];
  const s = {
    sm: "h-8 px-3 text-[13px] rounded-lg gap-1.5",
    md: "h-10 px-4 text-sm rounded-[10px] gap-2",
    lg: "h-11 px-5 text-sm rounded-xl gap-2",
    icon: "h-9 w-9 rounded-[10px] justify-center",
  }[size];
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center font-medium whitespace-nowrap transition active:translate-y-px disabled:opacity-40 disabled:pointer-events-none cursor-pointer",
        v,
        s,
        className,
      )}
      {...p}
    >
      {children}
    </button>
  );
}

export function Field({ id, label, hint, error, children, labelClassName = "" }: { id: string; label: ReactNode; hint?: ReactNode; error?: string; children: ReactNode; labelClassName?: string }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label htmlFor={id} className={cx("text-[13px] font-medium text-ink", labelClassName)}>
        {label}
      </label>
      {children}
      {error ? (
        <span className="text-[12.5px] text-high flex items-center gap-1.5" role="alert">
          <AlertCircle size={13} aria-hidden="true" />
          {error}
        </span>
      ) : hint ? (
        <span className="text-[12.5px] text-faint">{hint}</span>
      ) : null}
    </div>
  );
}

export function Select({
  id,
  value,
  onChange,
  children,
  className = "",
  selectClassName = "",
  ...p
}: {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
  className?: string;
  selectClassName?: string;
  "aria-label"?: string;
  disabled?: boolean;
}) {
  return (
    <div className={cx("relative", className)}>
      <select id={id} className={cx("fld", selectClassName)} value={value} onChange={onChange} {...p}>
        {children}
      </select>
      <ChevronDown size={15} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted" />
    </div>
  );
}

export const RISK = {
  high: { label: "High", fg: "text-high", bg: "bg-high-soft", dot: "var(--high-dot)" },
  medium: { label: "Medium", fg: "text-med", bg: "bg-med-soft", dot: "var(--med-dot)" },
  low: { label: "Low", fg: "text-low", bg: "bg-low-soft", dot: "var(--low-dot)" },
} as const;

export function RiskBadge({ risk }: { risk: keyof typeof RISK }) {
  const r = RISK[risk];
  return (
    <span className={cx("inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[12px] font-semibold", r.bg, r.fg)}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: r.dot }} />
      {r.label} risk
    </span>
  );
}

export function Hi({ text, mark }: { text: string; mark?: string | null }) {
  const i = mark ? text.indexOf(mark) : -1;
  if (!mark || i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-mark text-ink rounded px-0.5 -mx-0.5">{mark}</mark>
      {text.slice(i + mark.length)}
    </>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-faint">{children}</span>;
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="font-display text-[40px] leading-[1.05] font-semibold tracking-[-0.035em]">{children}</h1>;
}
