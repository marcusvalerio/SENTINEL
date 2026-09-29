"use client";

import { AnimatePresence, motion } from "motion/react";
import { CornerDownLeft, Lightbulb } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Kbd } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { captureIdea } from "@/server/ideas/actions";

/**
 * Idea capture from anywhere: one line, Enter, done. When opened inside a
 * project the idea is attached to it (and can be detached with one click).
 */
export function QuickCapture({ open, onClose, project }: { open: boolean; onClose: () => void; project: { id: string; name: string } | null }) {
  const [text, setText] = useState("");
  const [attach, setAttach] = useState(true);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      setText("");
      setAttach(true);
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const save = () => {
    if (!text.trim()) return;
    startTransition(async () => {
      const result = await captureIdea({ text, projectId: attach && project ? project.id : null });
      if (!result.ok) {
        toast.show({ tone: "error", title: "Não foi possível guardar", description: result.error });
        return;
      }
      toast.show({ title: "Ideia guardada na Inbox", description: attach && project ? `Ligada a ${project.name}` : undefined });
      onClose();
    });
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center px-3 pt-[18vh]">
          <motion.div className="absolute inset-0 bg-[rgb(10_11_14/0.6)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden />
          <motion.form
            role="dialog"
            aria-modal="true"
            aria-label="Capturar ideia"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 520, damping: 40 }}
            className="relative w-full max-w-xl overflow-hidden rounded-xl bg-surface shadow-overlay"
          >
            <div className="flex items-center gap-3 px-4">
              <Lightbulb className="size-4 shrink-0 text-accent" aria-hidden />
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={500}
                placeholder="Uma ideia, em uma linha…"
                aria-label="Ideia"
                className="h-14 min-w-0 flex-1 bg-transparent font-display text-h4 text-fg-strong outline-none placeholder:text-fg-subtle focus-visible:shadow-none max-sm:text-base"
              />
              {pending ? <Spinner className="text-fg-subtle" /> : <CornerDownLeft className="size-4 text-fg-subtle" aria-hidden />}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-caption tracking-normal text-fg-subtle">
              {project ? (
                <button type="button" onClick={() => setAttach((a) => !a)} aria-pressed={attach} className="truncate rounded-xs px-1 transition-colors hover:text-fg">
                  {attach ? <>Ligada a <span className="text-fg">{project.name}</span> · desfazer</> : "Sem projeto · ligar a este projeto"}
                </button>
              ) : (
                <span>Vai para a Inbox. Depois vira funcionalidade, milestone ou projeto.</span>
              )}
              <span className="flex shrink-0 items-center gap-1">
                <Kbd>↵</Kbd> guardar
              </span>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
