"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, CircleAlert, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ToastTone = "success" | "error" | "info";
type Toast = { id: number; title: string; description?: string; tone: ToastTone };
type ToastApi = { show: (toast: Omit<Toast, "id" | "tone"> & { tone?: ToastTone }) => void };

const ToastContext = createContext<ToastApi | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const ICONS: Record<ToastTone, ReactNode> = {
  success: <Check className="size-3.5 stroke-[2.5]" />,
  error: <CircleAlert className="size-3.5" />,
  info: <Info className="size-3.5" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const show = useCallback<ToastApi["show"]>(
    ({ tone = "success", ...toast }) => {
      const id = ++counter.current;
      setToasts((all) => [...all.slice(-2), { id, tone, ...toast }]);
      setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4200);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-toast)] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end sm:p-6"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.14 } }}
              transition={{ type: "spring", stiffness: 480, damping: 36 }}
              role={toast.tone === "error" ? "alert" : "status"}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md bg-surface-2 p-3 pr-2 shadow-overlay"
            >
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                  toast.tone === "success" && "bg-accent text-fg-on-accent",
                  toast.tone === "error" && "bg-danger-soft text-danger",
                  toast.tone === "info" && "bg-identity text-info",
                )}
              >
                {ICONS[toast.tone]}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-px">
                <p className="text-body-sm font-medium text-fg-strong">{toast.title}</p>
                {toast.description && <p className="text-body-sm text-fg-muted">{toast.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dispensar notificação"
                className="flex size-6 shrink-0 items-center justify-center rounded-xs text-fg-subtle transition-colors hover:bg-surface-3 hover:text-fg"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
