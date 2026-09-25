"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Circle, CircleDashed, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { PRIORITY_TONE, PriorityPicker } from "@/components/project-form/priority-picker";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { FEATURE_PRIORITY_LABELS, FEATURE_STATUS_LABELS, type FeaturePriority, type FeatureStatus } from "@/domain/project";
import { cn } from "@/lib/cn";
import { addFeature, deleteFeature, setFeatureStatus } from "@/server/projects/actions";

type Feature = { id: string; name: string; description: string | null; priority: FeaturePriority; status: FeatureStatus };

const NEXT: Record<FeatureStatus, FeatureStatus> = { planned: "in_progress", in_progress: "done", done: "planned" };

function StatusGlyph({ status }: { status: FeatureStatus }) {
  if (status === "done")
    return (
      <motion.span initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600, damping: 22 }} className="flex size-5 items-center justify-center rounded-full bg-accent text-fg-on-accent">
        <Check className="size-3 stroke-[3]" />
      </motion.span>
    );
  if (status === "in_progress") return <CircleDashed className="size-5 animate-[spin_6s_linear_infinite] text-[#93a6d8]" />;
  return <Circle className="size-5 text-fg-subtle" />;
}

export function FeatureBoard({ projectId, features }: { projectId: string; features: Feature[] }) {
  const [optimistic, update] = useOptimistic(features, (state, change: { id: string; status?: FeatureStatus; remove?: boolean }) =>
    change.remove ? state.filter((f) => f.id !== change.id) : state.map((f) => (f.id === change.id ? { ...f, status: change.status ?? f.status } : f)),
  );
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [priority, setPriority] = useState<FeaturePriority>("important");
  const [saving, startSaving] = useTransition();
  const toast = useToast();

  const cycle = (feature: Feature, status: FeatureStatus = NEXT[feature.status]) =>
    startTransition(async () => {
      update({ id: feature.id, status });
      const result = await setFeatureStatus(projectId, feature.id, status);
      if (!result.ok) toast.show({ tone: "error", title: "Não foi possível atualizar", description: result.error });
    });

  const remove = (feature: Feature) =>
    startTransition(async () => {
      update({ id: feature.id, remove: true });
      const result = await deleteFeature(projectId, feature.id);
      toast.show(result.ok ? { title: "Funcionalidade removida", description: "A alteração de escopo entrou na timeline." } : { tone: "error", title: "Não foi possível remover", description: result.error });
    });

  const add = () =>
    startSaving(async () => {
      const result = await addFeature(projectId, { name, priority });
      if (!result.ok) {
        toast.show({ tone: "error", title: "Não foi possível adicionar", description: result.error });
        return;
      }
      setName("");
    });

  return (
    <div className="flex flex-col gap-3">
      {optimistic.length > 0 && (
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-lg bg-surface/60 shadow-[inset_0_0_0_1px_var(--color-line)]">
          <AnimatePresence initial={false}>
            {optimistic.map((feature) => (
              <motion.li key={feature.id} layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="group flex items-start gap-3 px-4 py-3.5 sm:px-5">
                <button
                  type="button"
                  onClick={() => cycle(feature)}
                  aria-label={`${feature.name}: ${FEATURE_STATUS_LABELS[feature.status]}. Avançar para ${FEATURE_STATUS_LABELS[NEXT[feature.status]]}`}
                  className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90"
                >
                  <StatusGlyph status={feature.status} />
                </button>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={cn("text-body-sm font-medium transition-colors", feature.status === "done" ? "text-fg-muted line-through decoration-fg-subtle/60" : "text-fg-strong")}>{feature.name}</span>
                  {feature.description && <span className="text-body-sm text-fg-muted">{feature.description}</span>}
                </div>
                <span className="hidden shrink-0 items-center gap-1.5 pt-0.5 text-caption tracking-normal text-fg-muted sm:flex">
                  <span className={`size-1.5 rounded-full ${PRIORITY_TONE[feature.priority]}`} aria-hidden />
                  {FEATURE_PRIORITY_LABELS[feature.priority]}
                </span>
                <span className="hidden w-24 shrink-0 pt-0.5 text-right text-caption tracking-normal text-fg-subtle md:inline">{FEATURE_STATUS_LABELS[feature.status]}</span>
                <Dropdown
                  width={200}
                  trigger={({ ref, toggle, ...aria }) => (
                    <button ref={ref} type="button" onClick={toggle} {...aria} aria-label={`Ações para ${feature.name}`} className="-my-1 flex size-7 shrink-0 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg-strong">
                      <MoreHorizontal className="size-4" />
                    </button>
                  )}
                  items={[
                    { type: "label", label: "Status" },
                    ...(["planned", "in_progress", "done"] as const).map((s) => ({ label: FEATURE_STATUS_LABELS[s], selected: feature.status === s, onSelect: () => cycle(feature, s) })),
                    { type: "separator" as const },
                    { label: "Remover", icon: <Trash2 />, tone: "danger" as const, onSelect: () => remove(feature) },
                  ]}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <AnimatePresence initial={false} mode="wait">
        {adding ? (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) add();
            }}
            className="flex flex-col gap-2.5 rounded-lg bg-surface p-3 shadow-[inset_0_0_0_1px_var(--color-line-2)] sm:flex-row sm:items-center"
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da nova funcionalidade" autoFocus aria-label="Nome da nova funcionalidade" onKeyDown={(e) => e.key === "Escape" && setAdding(false)} />
            <PriorityPicker value={priority} onChange={setPriority} label="Prioridade da nova funcionalidade" />
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
                Fechar
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={saving} disabled={!name.trim()}>
                Adicionar
              </Button>
            </div>
          </motion.form>
        ) : (
          <motion.div key="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Button variant="secondary" size="sm" leading={<Plus />} onClick={() => setAdding(true)}>
              Nova funcionalidade
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
