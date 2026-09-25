"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { NOTE_TYPES, NOTE_TYPE_LABELS, type NoteType } from "@/domain/notes";
import { cn } from "@/lib/cn";
import { useIsMac } from "@/lib/use-platform";
import { createNote, updateNote, type NoteInput } from "@/server/notes/actions";
import { NOTE_ICONS } from "./note-meta";

type ComposerProps = {
  projectId: string;
  initial?: { id: string; title: string; content: string; type: NoteType };
  defaultType?: NoteType;
  autoFocus?: boolean;
  onDone?: () => void;
  onCancel?: () => void;
};

export function NoteForm({ projectId, initial, defaultType = "note", autoFocus, onDone, onCancel }: ComposerProps) {
  const [values, setValues] = useState<NoteInput>({ title: initial?.title ?? "", content: initial?.content ?? "", type: initial?.type ?? defaultType });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const isMac = useIsMac();

  const submit = () =>
    startTransition(async () => {
      const result = initial ? await updateNote(projectId, initial.id, values) : await createNote(projectId, values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) toast.show({ tone: "error", title: "Não foi possível salvar", description: result.error });
        return;
      }
      toast.show({
        title: initial ? "Registro atualizado" : "Registro adicionado à Rubrica",
        description: !initial && values.type === "decision" ? "A decisão também entrou na timeline." : undefined,
      });
      setValues({ title: "", content: "", type: values.type });
      setErrors({});
      onDone?.();
    });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          submit();
        }
        if (e.key === "Escape" && onCancel) onCancel();
      }}
    >
      <div role="radiogroup" aria-label="Tipo de registro" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {NOTE_TYPES.map((type) => {
          const selected = values.type === type;
          return (
            <label
              key={type}
              className={cn(
                "flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-xs px-2 text-caption font-medium tracking-normal transition-colors has-[:focus-visible]:shadow-focus [&_svg]:size-3",
                selected ? "bg-identity text-fg-strong shadow-[inset_0_0_0_1px_rgb(215_196_133/0.4)]" : "text-fg-muted shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-surface-2 hover:text-fg",
              )}
            >
              <input type="radio" name="note-type" value={type} checked={selected} onChange={() => setValues((v) => ({ ...v, type }))} className="sr-only" />
              <span className={selected ? "text-accent" : "text-fg-subtle"}>{NOTE_ICONS[type]}</span>
              {NOTE_TYPE_LABELS[type]}
            </label>
          );
        })}
      </div>
      <FormField label={<span className="sr-only">Título</span>} error={errors.title} className="gap-0">
        <Input
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          placeholder="Título do registro"
          autoFocus={autoFocus}
          autoComplete="off"
          className="h-11 font-display text-h4 font-medium"
        />
      </FormField>
      <FormField label={<span className="sr-only">Conteúdo</span>} error={errors.content} className="gap-0">
        <Textarea value={values.content} onChange={(e) => setValues((v) => ({ ...v, content: e.target.value }))} placeholder="O que aconteceu, o que foi pensado, o que foi decidido…" minRows={4} />
      </FormField>
      <div className="flex items-center justify-between gap-3">
        <span className="hidden text-caption tracking-normal text-fg-subtle sm:inline">{isMac ? "⌘" : "Ctrl"} + Enter para salvar</span>
        <div className="ml-auto flex gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit" variant="primary" size="sm" loading={pending}>
            {initial ? "Salvar" : "Registrar"}
          </Button>
        </div>
      </div>
    </form>
  );
}

/** Collapsed prompt that opens into the full composer. */
export function NoteComposer({ projectId, startOpen = false, defaultType }: { projectId: string; startOpen?: boolean; defaultType?: NoteType }) {
  const [open, setOpen] = useState(startOpen);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!startOpen) return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("new")) {
      url.searchParams.delete("new");
      window.history.replaceState(window.history.state, "", url);
    }
  }, [startOpen]);

  return (
    <div className="overflow-hidden rounded-lg bg-surface shadow-[inset_0_0_0_1px_var(--color-line-2)]">
      <AnimatePresence mode="wait" initial={false}>
        {open ? (
          <motion.div key="form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.24, ease: [0.25, 1, 0.5, 1] }}>
            <div className="p-4 sm:p-5">
              <NoteForm
                projectId={projectId}
                defaultType={defaultType}
                autoFocus
                onDone={() => setOpen(false)}
                onCancel={() => {
                  setOpen(false);
                  requestAnimationFrame(() => triggerRef.current?.focus());
                }}
              />
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="prompt"
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex w-full items-center gap-3 px-4 py-4 text-left text-body text-fg-subtle transition-colors hover:bg-surface-2/60 hover:text-fg-muted sm:px-5"
          >
            <span className="flex size-7 items-center justify-center rounded-sm bg-accent text-fg-on-accent">
              <Plus className="size-4 stroke-[2.25]" aria-hidden />
            </span>
            Registrar algo sobre este projeto…
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
