"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/client";
import { Btn, Field, Logo, cx } from "./ui";

export function AuthScreen({ mode, notice, initialEmail = "" }: { mode: "login" | "signup"; notice?: string; initialEmail?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr({});
    setBusy(true);
    try {
      if (mode === "signup") {
        await api("/api/auth/signup", { method: "POST", json: { name, email, password: pw } });
        router.push(`/login?created=1&email=${encodeURIComponent(email.trim().toLowerCase())}`);
      } else {
        await api("/api/auth/login", { method: "POST", json: { email, password: pw } });
        router.replace("/projects");
        router.refresh();
      }
    } catch (e) {
      const a = e as ApiError;
      setErr(a.fields ?? { pw: a.message });
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden lg:flex flex-col justify-between p-12 bg-sunken border-r border-line relative overflow-hidden">
        <Logo size={30} />
        <div className="max-w-[520px] flex flex-col gap-8">
          <h1 className="font-display text-[56px] leading-[1.02] font-semibold tracking-[-0.035em]">Pick up scope drift before it ships.</h1>
          <p className="text-[16px] text-muted max-w-[440px]">
            Dripi compares every PRD, compliance note, meeting and email against your signed SOW, and turns each conflict into a decision someone can answer.
          </p>
          <div className="flex flex-col gap-2.5 max-w-[460px]" aria-hidden="true">
            <div className="flex gap-3 items-start p-4 rounded-2xl bg-surface border border-line shadow-soft">
              <span className="font-mono text-[11px] text-faint w-10 pt-0.5">SOW</span>
              <span className="text-[14px]">Patient notifications are delivered by <mark className="bg-mark text-ink rounded px-0.5">email only</mark>.</span>
            </div>
            <div className="drift flex gap-3 items-start p-4 rounded-2xl bg-surface border border-line shadow-soft ml-8">
              <span className="font-mono text-[11px] text-faint w-10 pt-0.5">PRD</span>
              <span className="text-[14px]">Patients can reply to appointment reminders <mark className="bg-mark text-ink rounded px-0.5">by SMS</mark>.</span>
            </div>
          </div>
        </div>
        <p className="font-mono text-[11.5px] text-faint">Dripi · Drift Picker</p>
      </section>
      <section className="flex items-center justify-center px-4 py-14">
        <form onSubmit={submit} noValidate className="rise w-full max-w-[380px] flex flex-col gap-7">
          <div className="lg:hidden"><Logo size={28} /></div>
          <div className="flex flex-col gap-1.5">
            <h2 className="font-display text-[34px] leading-tight font-semibold tracking-[-0.03em]">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
            <p className="text-muted">{mode === "login" ? "Log in to your projects." : "Stakeholders never need an account. Only you do."}</p>
          </div>
          {notice && mode === "login" && (
            <div role="status" className="pop flex items-center gap-2.5 p-3 rounded-xl bg-ok-soft text-ok text-[13.5px] font-medium">
              <CheckCircle2 size={16} aria-hidden="true" />{notice}
            </div>
          )}
          <div className="flex flex-col gap-4">
            {mode === "signup" && (
              <Field id="a-name" label="Name" error={err.name}>
                <input id="a-name" className={cx("fld", err.name && "bad")} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Your full name" />
              </Field>
            )}
            <Field id="a-email" label="Work email" error={err.email}>
              <input id="a-email" type="email" className={cx("fld", err.email && "bad")} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@company.com" />
            </Field>
            <Field id="a-pw" label="Password" error={err.pw ?? err.password} hint={mode === "signup" ? "At least 8 characters." : undefined}>
              <div className="relative">
                <input id="a-pw" type={show ? "text" : "password"} className={cx("fld pr-11", (err.pw || err.password) && "bad")} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-ink cursor-pointer">
                  {show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
            </Field>
          </div>
          <div className="flex flex-col gap-3">
            <Btn size="lg" type="submit" disabled={busy}>
              {busy ? (<><Loader2 size={16} className="animate-spin" aria-hidden="true" />{mode === "login" ? "Logging in" : "Creating account"}</>) : mode === "login" ? "Log in" : "Create account"}
            </Btn>
            <p className="text-center text-[13.5px] text-muted">
              {mode === "login" ? "New to Dripi? " : "Already have an account? "}
              <Link href={mode === "login" ? "/signup" : "/login"} className="text-ink font-medium underline underline-offset-4 decoration-line-strong hover:decoration-ink">
                {mode === "login" ? "Sign up" : "Log in"}
              </Link>
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}
