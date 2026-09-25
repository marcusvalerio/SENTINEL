"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, FilePen, Trash2 } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { stepCounter } from "@/components/ui/stepper";
import { FORM_STEPS } from "@/domain/project-form";
import { formatRelative } from "@/lib/format";
import { deleteDraft } from "@/server/projects/actions";

type Draft = { id: string; title: string | null; currentStep: number; updatedAt: string };

export function DraftList({ drafts }: { drafts: Draft[] }) {
  const [optimistic, removeOptimistic] = useOptimistic(drafts, (state, id: string) => state.filter((d) => d.id !== id));
  const [pendingDelete, setPendingDelete] = useState<Draft | null>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  if (optimistic.length === 0) return null;

  const confirmDelete = () => {
    const draft = pendingDelete;
    if (!draft) return;
    setPendingDelete(null);
    startTransition(async () => {
      removeOptimistic(draft.id);
      const result = await deleteDraft(draft.id);
      toast.show(result.ok ? { title: "Rascunho descartado" } : { title: "Não foi possível descartar", description: result.error, tone: "error" });
    });
  };

  return (
    <section aria-labelledby="drafts-heading" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 id="drafts-heading" className="eyebrow">
          Em registro
        </h2>
        <span className="font-numeric text-caption text-fg-subtle">{optimistic.length}</span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false}>
          {optimistic.map((draft) => {
            const step = Math.min(draft.currentStep, FORM_STEPS.length - 1);
            return (
              <motion.li
                key={draft.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
                className="group relative flex items-center gap-3 rounded-md bg-surface p-3 pr-2 shadow-[inset_0_0_0_1px_var(--color-line)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--color-line-2)]"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-sunken text-fg-subtle shadow-[inset_0_0_0_1px_var(--color-line)]">
                  <FilePen className="size-4" aria-hidden />
                </span>
                <Link href={`/projects/new?draft=${draft.id}`} className="flex min-w-0 flex-1 flex-col after:absolute after:inset-0 after:rounded-md focus-visible:shadow-none focus-visible:after:shadow-focus">
                  <span className="truncate text-body-sm font-medium text-fg-strong">{draft.title ?? "Projeto sem nome"}</span>
                  <span className="truncate text-caption tracking-normal text-fg-subtle" suppressHydrationWarning>
                    <span className="font-mono">{stepCounter(step, FORM_STEPS.length)}</span> · {FORM_STEPS[step]!.label} · {formatRelative(draft.updatedAt)}
                  </span>
                </Link>
                <ArrowRight className="size-4 shrink-0 text-fg-subtle transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden />
                <IconButton label="Descartar rascunho" size="sm" tone="danger" className="relative z-10" onClick={() => setPendingDelete(draft)} disabled={isPending}>
                  <Trash2 />
                </IconButton>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Descartar rascunho?"
        description={`“${pendingDelete?.title ?? "Projeto sem nome"}” e tudo o que foi preenchido nele serão apagados. Isso não pode ser desfeito.`}
        confirmLabel="Descartar"
      />
    </section>
  );
}
