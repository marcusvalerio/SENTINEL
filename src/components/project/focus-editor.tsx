"use client";

import { AnimatePresence, motion } from "motion/react";
import { Crosshair, PencilLine } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { setCurrentFocus } from "@/server/projects/actions";

/**
 * "Foco atual" — one sentence about what the project is about right now.
 * Edited in place: click, type, Enter saves, Escape cancels.
 */
export function FocusEditor({ projectId, focus }: { projectId: string; focus: string | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(focus ?? "");
  const [pending, start] = useTransition();
  const toast = useToast();
  const input = useRef<HTMLTextAreaElement>(null);

  const save = () =>
    start(async () => {
      const result = await setCurrentFocus(projectId, value);
      if (!result.ok) {
        toast.show({ tone: "error", title: result.error });
        return;
      }
      setEditing(false);
    });

  const cancel = () => {
    setValue(focus ?? "");
    setEditing(false);
  };

  return (
    <section aria-labelledby="focus" className="flex flex-col gap-3">
      <h2 id="focus" className="eyebrow flex items-center gap-2">
        <Crosshair className="size-3 text-accent" aria-hidden />
        Foco atual
      </h2>
      <AnimatePresence mode="wait" initial={false}>
        {editing ? (
          <motion.form
            key="edit"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <textarea
              ref={input}
              autoFocus
              rows={2}
              maxLength={280}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") cancel();
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  save();
                }
              }}
              aria-label="Foco atual do projeto"
              placeholder="Ex.: Fechar o fluxo de pagamento antes do beta."
              className="w-full resize-none rounded-md bg-surface-2/70 px-3.5 py-3 font-display text-h4 leading-snug text-fg-strong shadow-[inset_0_0_0_1px_var(--color-line-strong)] outline-none placeholder:text-fg-subtle focus:shadow-[inset_0_0_0_1px_rgb(215_196_133/0.5)]"
            />
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" variant="primary" loading={pending}>
                Salvar foco
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={cancel} disabled={pending}>
                Cancelar
              </Button>
              <span className="ml-auto font-numeric text-caption text-fg-subtle">{value.length}/280</span>
            </div>
          </motion.form>
        ) : (
          <motion.button
            key="view"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setEditing(true)}
            className="group -mx-3 flex w-[calc(100%+1.5rem)] items-start gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-hover"
          >
            {focus ? (
              <span className="font-display text-h4 leading-snug text-fg-strong">{focus}</span>
            ) : (
              <span className="text-body text-fg-subtle">Defina em uma frase o que importa agora neste projeto.</span>
            )}
            <PencilLine className="mt-1 ml-auto size-3.5 shrink-0 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
            <span className="sr-only">Editar foco atual</span>
          </motion.button>
        )}
      </AnimatePresence>
    </section>
  );
}
