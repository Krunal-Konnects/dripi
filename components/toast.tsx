"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, X } from "lucide-react";

type Toast = { id: number; msg: string; undo?: () => void };
const Ctx = createContext<(msg: string, undo?: () => void) => void>(() => {});

export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const dismiss = (id: number) => setItems((t) => t.filter((x) => x.id !== id));
  const toast = useCallback((msg: string, undo?: () => void) => {
    const id = Date.now() + Math.random();
    setItems((t) => [...t, { id, msg, undo }]);
    setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="fixed z-[60] bottom-5 right-5 left-5 sm:left-auto flex flex-col gap-2 items-end pointer-events-none" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} role="status" className="pop pointer-events-auto flex items-center gap-3 pl-4 pr-2 min-h-12 py-2 rounded-xl bg-ink text-bg shadow-soft text-[14px]">
            <CheckCircle2 size={16} className="text-accent shrink-0" aria-hidden="true" />
            <span>{t.msg}</span>
            {t.undo && (
              <button
                onClick={() => {
                  t.undo?.();
                  dismiss(t.id);
                }}
                className="ml-1 h-8 px-2.5 rounded-lg font-medium underline underline-offset-4 hover:bg-white/10 cursor-pointer"
              >
                Undo
              </button>
            )}
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="h-8 w-8 inline-flex items-center justify-center rounded-lg opacity-70 hover:opacity-100 hover:bg-white/10 cursor-pointer">
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
