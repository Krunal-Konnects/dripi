"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  CornerDownLeft, FolderOpen, ListChecks, LogOut, Moon, PanelLeftClose, PanelLeftOpen, Plus, ScanSearch, Search, Sun,
} from "lucide-react";
import { Btn, Logo, cx } from "./ui";
import { ToastProvider } from "./toast";

type ShellProps = {
  user: { name: string; email: string };
  openCount: number;
  projects: { id: string; code: string; name: string }[];
  children: ReactNode;
};

function subscribeTheme(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

function useTheme() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    () => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"),
    () => "light" as const,
  );
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("dripi-theme", next);
    } catch {}
  };
  return { theme, toggle };
}

export function AppShell({ user, openCount, projects, children }: ShellProps) {
  const router = useRouter();
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [palette, setPalette] = useState(false);
  const { theme, toggle } = useTheme();
  const active = path.startsWith("/decisions") ? "decisions" : "projects";

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  const actions = useMemo(
    () => [
      { label: "New project", icon: Plus, run: () => router.push("/projects/new") },
      { label: "Go to Projects", icon: FolderOpen, run: () => router.push("/projects") },
      { label: "Go to Decisions", icon: ListChecks, run: () => router.push("/decisions") },
      ...projects.map((p) => ({ label: `Scope check · ${p.name}`, hint: p.code, icon: ScanSearch, run: () => router.push(`/projects/${p.id}/check`) })),
      { label: theme === "dark" ? "Switch to light theme" : "Switch to dark theme", icon: theme === "dark" ? Sun : Moon, run: toggle },
      { label: "Log out", icon: LogOut, run: logout },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projects, theme],
  );

  const items = [
    { k: "projects", href: "/projects", label: "Projects", Icon: FolderOpen, badge: 0 },
    { k: "decisions", href: "/decisions", label: "Decisions", Icon: ListChecks, badge: openCount },
  ];
  const initials = user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <ToastProvider>
      <div className="min-h-screen flex">
        <aside className={cx("hidden md:flex flex-col justify-between border-r border-line bg-bg transition-[width] duration-300 ease-out sticky top-0 h-screen shrink-0", collapsed ? "w-[72px]" : "w-[248px]")}>
          <div className="flex flex-col gap-6 p-3">
            <div className={cx("flex items-center h-11", collapsed ? "justify-center" : "justify-between pl-2")}>
              <Link href="/projects" aria-label="Dripi home" className="rounded-lg">
                <Logo size={26} word={!collapsed} />
              </Link>
              {!collapsed && (
                <Btn variant="quiet" size="icon" onClick={() => setCollapsed(true)} aria-label="Collapse sidebar">
                  <PanelLeftClose size={17} aria-hidden="true" />
                </Btn>
              )}
            </div>
            <button onClick={() => setPalette(true)} aria-label="Search and commands" className={cx("flex items-center gap-2.5 h-10 rounded-[10px] border border-line bg-surface text-faint hover:border-line-strong hover:text-ink transition cursor-pointer", collapsed ? "justify-center w-12 mx-auto" : "px-3")}>
              <Search size={15} aria-hidden="true" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left text-[13.5px]">Search or jump to…</span>
                  <kbd className="font-mono text-[11px] px-1.5 py-0.5 rounded border border-line text-faint">⌘K</kbd>
                </>
              )}
            </button>
            <nav aria-label="Main" className="flex flex-col gap-0.5">
              {items.map(({ k, href, label, Icon, badge }) => (
                <Link key={k} href={href} aria-current={active === k ? "page" : undefined} title={collapsed ? label : undefined}
                  className={cx("flex items-center gap-3 h-10 rounded-[10px] text-[14px] font-medium transition", collapsed ? "justify-center" : "px-3",
                    active === k ? "bg-surface text-ink shadow-soft ring-1 ring-line" : "text-muted hover:bg-sunken hover:text-ink")}>
                  <Icon size={17} aria-hidden="true" />
                  {!collapsed && <span className="flex-1 text-left">{label}</span>}
                  {!collapsed && badge > 0 && (
                    <span className="tnum font-mono text-[11px] min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-accent-ink inline-flex items-center justify-center" aria-label={`${badge} open`}>
                      {badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-col gap-2 p-3">
            {collapsed && (
              <Btn variant="quiet" size="icon" className="mx-auto" onClick={() => setCollapsed(false)} aria-label="Expand sidebar">
                <PanelLeftOpen size={17} aria-hidden="true" />
              </Btn>
            )}
            <Btn variant="quiet" size={collapsed ? "icon" : "md"} className={collapsed ? "mx-auto" : "justify-start px-3"} onClick={toggle} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
              {theme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
              {!collapsed && (theme === "dark" ? "Light theme" : "Dark theme")}
            </Btn>
            <div className={cx("flex items-center gap-2.5 rounded-xl bg-surface ring-1 ring-line", collapsed ? "p-1.5 justify-center" : "p-2")}>
              <span className="w-8 h-8 rounded-full bg-ink text-bg text-[12px] font-semibold inline-flex items-center justify-center shrink-0">{initials}</span>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{user.name}</div>
                  <div className="text-[12px] text-faint truncate">{user.email}</div>
                </div>
              )}
            </div>
            <Btn variant="ghost" size={collapsed ? "icon" : "md"} className={collapsed ? "mx-auto" : "w-full"} onClick={logout} aria-label="Log out">
              <LogOut size={16} aria-hidden="true" />
              {!collapsed && "Log out"}
            </Btn>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="md:hidden sticky top-0 z-20 flex items-center justify-between h-14 px-4 border-b border-line bg-bg">
            <Logo size={24} />
            <div className="flex items-center gap-1">
              <Btn variant="quiet" size="icon" onClick={() => setPalette(true)} aria-label="Search"><Search size={17} aria-hidden="true" /></Btn>
              <Link href="/projects" aria-label="Projects" className={cx("h-9 w-9 rounded-[10px] inline-flex items-center justify-center", active === "projects" ? "bg-surface ring-1 ring-line" : "text-muted")}><FolderOpen size={17} aria-hidden="true" /></Link>
              <Link href="/decisions" aria-label="Decisions" className={cx("h-9 w-9 rounded-[10px] inline-flex items-center justify-center", active === "decisions" ? "bg-surface ring-1 ring-line" : "text-muted")}><ListChecks size={17} aria-hidden="true" /></Link>
              <Btn variant="quiet" size="icon" onClick={toggle} aria-label="Toggle theme">{theme === "dark" ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}</Btn>
              <Btn variant="quiet" size="icon" onClick={logout} aria-label="Log out"><LogOut size={17} aria-hidden="true" /></Btn>
            </div>
          </header>
          <main className="flex-1 w-full max-w-[1180px] mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-12 pb-24">{children}</main>
        </div>
      </div>
      {palette && <Palette actions={actions} onClose={() => setPalette(false)} />}
    </ToastProvider>
  );
}

type Action = { label: string; hint?: string; icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>; run: () => void };

function Palette({ actions, onClose }: { actions: Action[]; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const list = actions.filter((a) => a.label.toLowerCase().includes(q.toLowerCase()));
  const key = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setI(Math.min(i + 1, list.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setI(Math.max(i - 1, 0)); }
    if (e.key === "Enter" && list[i]) { list[i].run(); onClose(); }
    if (e.key === "Escape") onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[14vh]">
      <div className="fadein absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="Command menu" className="pop relative w-full max-w-[540px] rounded-2xl bg-surface ring-1 ring-line shadow-soft overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b border-line">
          <Search size={17} className="text-faint" aria-hidden="true" />
          <input autoFocus id="pal-q" aria-label="Search commands" className="flex-1 h-14 bg-transparent outline-none text-[15px] placeholder:text-faint" placeholder="Search projects and actions" value={q} onChange={(e) => { setQ(e.target.value); setI(0); }} onKeyDown={key} />
          <kbd className="font-mono text-[11px] px-1.5 py-0.5 rounded border border-line text-faint">esc</kbd>
        </div>
        <ul role="listbox" aria-label="Commands" className="p-1.5 max-h-[340px] overflow-y-auto">
          {list.length === 0 && <li className="px-3 py-6 text-center text-muted text-[13.5px]">Nothing matches “{q}”.</li>}
          {list.map((a, j) => {
            const Icon = a.icon;
            return (
              <li key={a.label} role="option" aria-selected={i === j}>
                <button onMouseEnter={() => setI(j)} onClick={() => { a.run(); onClose(); }} className={cx("w-full flex items-center gap-3 h-11 px-3 rounded-xl text-left text-[14px] transition cursor-pointer", i === j ? "bg-sunken text-ink" : "text-muted")}>
                  <Icon size={16} aria-hidden={true} />
                  <span className="flex-1">{a.label}</span>
                  {a.hint && <span className="font-mono text-[11.5px] text-faint">{a.hint}</span>}
                  {i === j && <CornerDownLeft size={14} aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
