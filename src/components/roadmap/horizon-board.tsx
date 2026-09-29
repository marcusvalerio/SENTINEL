"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Check, Circle, CircleDashed, Link2, Lock, MoreHorizontal, Plus } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { PRIORITY_TONE } from "@/components/project-form/priority-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/choice";
import { Dropdown } from "@/components/ui/dropdown";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { FEATURE_PRIORITY_LABELS, FEATURE_STATUS_LABELS, type FeaturePriority, type FeatureStatus } from "@/domain/project";
import { EFFORTS, EFFORT_HINTS, EFFORT_LABELS, HORIZONS, HORIZON_HINTS, HORIZON_LABELS, ITEM_ORIGIN_LABELS, blockedBy, type Effort, type Horizon, type ItemOrigin } from "@/domain/roadmap";
import { cn } from "@/lib/cn";
import { setFeatureStatus } from "@/server/projects/actions";
import { addRoadmapItem, planFeature } from "@/server/roadmap/actions";

export type RoadmapItem = {
  id: string;
  name: string;
  status: FeatureStatus;
  priority: FeaturePriority;
  horizon: Horizon;
  effort: Effort | null;
  origin: ItemOrigin;
  milestoneId: string | null;
  dependsOn: string[];
};

type Change = { id: string } & Partial<Omit<RoadmapItem, "id">>;

const NEXT_STATUS: Record<FeatureStatus, FeatureStatus> = { planned: "in_progress", in_progress: "done", done: "planned" };
const PRIORITY_ORDER: Record<FeaturePriority, number> = { essential: 0, important: 1, desirable: 2 };

function StatusGlyph({ status }: { status: FeatureStatus }) {
  if (status === "done")
    return (
      <span className="flex size-4 items-center justify-center rounded-full bg-accent text-fg-on-accent">
        <Check className="size-2.5 stroke-[3]" />
      </span>
    );
  if (status === "in_progress") return <CircleDashed className="size-4 text-[#93a6d8]" />;
  return <Circle className="size-4 text-fg-subtle" />;
}

export function HorizonBoard({ projectId, items, milestones }: { projectId: string; items: RoadmapItem[]; milestones: { id: string; name: string }[] }) {
  const [optimistic, apply] = useOptimistic(items, (state, change: Change) => state.map((i) => (i.id === change.id ? { ...i, ...change } : i)));
  const [, start] = useTransition();
  const [deps, setDeps] = useState<RoadmapItem | null>(null);
  const toast = useToast();

  const plan = (item: RoadmapItem, change: Omit<Change, "id">) =>
    start(async () => {
      apply({ id: item.id, ...change });
      const { status, ...planned } = change;
      const result = status ? await setFeatureStatus(projectId, item.id, status) : await planFeature(projectId, item.id, planned as Parameters<typeof planFeature>[2]);
      if (!result.ok) toast.show({ tone: "error", title: "Não foi possível atualizar", description: result.error });
    });

  const milestoneName = (id: string | null) => milestones.find((m) => m.id === id)?.name;

  return (
    <LayoutGroup>
      <div className="grid gap-x-0 gap-y-10 md:grid-cols-2 xl:grid-cols-4">
        {HORIZONS.map((h, index) => {
          const column = optimistic
            .filter((i) => i.horizon === h)
            .sort((a, b) => Number(a.status === "done") - Number(b.status === "done") || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
          return (
            <section key={h} aria-labelledby={`h-${h}`} className={cn("flex min-w-0 flex-col gap-4 md:px-5", index % 2 === 1 && "md:border-l md:border-line", index > 0 && "xl:border-l xl:border-line", index === 0 && "md:pl-0", index === 3 && "xl:pr-0")}>
              <header className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 id={`h-${h}`} className={cn("font-display text-h4 font-semibold tracking-[-0.01em]", h === "now" ? "text-accent" : "text-fg-strong")}>
                    {HORIZON_LABELS[h]}
                  </h2>
                  <span className="font-numeric text-caption tracking-normal text-fg-subtle">{column.length}</span>
                </div>
                <p className="text-caption tracking-normal text-fg-subtle">{HORIZON_HINTS[h]}</p>
              </header>

              <ul className="flex flex-col">
                <AnimatePresence initial={false}>
                  {column.map((item) => {
                    const blockers = blockedBy(item, optimistic);
                    const milestone = milestoneName(item.milestoneId);
                    return (
                      <motion.li
                        key={item.id}
                        layoutId={`roadmap-${item.id}`}
                        layout="position"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", stiffness: 420, damping: 38 }}
                        className="group flex items-start gap-2.5 border-t border-line py-3 first:border-t-0"
                      >
                        <button
                          type="button"
                          onClick={() => plan(item, { status: NEXT_STATUS[item.status] })}
                          aria-label={`${item.name}: ${FEATURE_STATUS_LABELS[item.status]}. Avançar para ${FEATURE_STATUS_LABELS[NEXT_STATUS[item.status]]}`}
                          className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90"
                        >
                          <StatusGlyph status={item.status} />
                        </button>
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className={cn("text-body-sm leading-snug", item.status === "done" ? "text-fg-muted line-through decoration-fg-subtle/60" : "text-fg-strong")}>{item.name}</span>
                          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-caption tracking-normal text-fg-subtle">
                            <span className="flex items-center gap-1.5" title={`Prioridade: ${FEATURE_PRIORITY_LABELS[item.priority]}`}>
                              <span className={cn("size-1.5 rounded-full", PRIORITY_TONE[item.priority])} aria-hidden />
                              {FEATURE_PRIORITY_LABELS[item.priority]}
                            </span>
                            {item.effort && (
                              <span className="font-numeric rounded-xs px-1 text-fg-muted shadow-[inset_0_0_0_1px_var(--color-line-2)]" title={`Esforço: ${EFFORT_HINTS[item.effort]}`}>
                                {EFFORT_LABELS[item.effort]}
                              </span>
                            )}
                            {milestone && <span className="truncate">◇ {milestone}</span>}
                            {item.origin !== "scope" && <span>{ITEM_ORIGIN_LABELS[item.origin]}</span>}
                          </span>
                          {blockers.length > 0 && item.status !== "done" && (
                            <span className="flex items-center gap-1.5 text-caption tracking-normal text-warning">
                              <Lock className="size-3" aria-hidden />
                              Depende de {blockers.map((b) => b.name).join(", ")}
                            </span>
                          )}
                        </div>
                        <Dropdown
                          width={230}
                          trigger={({ ref, toggle, ...aria }) => (
                            <button
                              ref={ref}
                              type="button"
                              onClick={toggle}
                              {...aria}
                              aria-label={`Planejar ${item.name}`}
                              className="-my-0.5 flex size-6 shrink-0 items-center justify-center rounded-sm text-fg-subtle opacity-60 transition-all group-hover:opacity-100 hover:bg-surface-2 hover:text-fg-strong focus-visible:opacity-100"
                            >
                              <MoreHorizontal className="size-4" />
                            </button>
                          )}
                          items={[
                            { type: "label" as const, label: "Mover para" },
                            ...HORIZONS.map((to) => ({ label: `${HORIZON_LABELS[to]} — ${HORIZON_HINTS[to]}`, selected: item.horizon === to, onSelect: () => plan(item, { horizon: to }) })),
                            { type: "separator" as const },
                            { type: "label" as const, label: "Esforço" },
                            ...EFFORTS.map((e) => ({ label: `${EFFORT_LABELS[e]} · ${EFFORT_HINTS[e]}`, selected: item.effort === e, onSelect: () => plan(item, { effort: item.effort === e ? null : e }) })),
                            { type: "separator" as const },
                            { type: "label" as const, label: "Milestone" },
                            { label: "Nenhum", selected: !item.milestoneId, onSelect: () => plan(item, { milestoneId: null }) },
                            ...milestones.map((m) => ({ label: m.name, selected: item.milestoneId === m.id, onSelect: () => plan(item, { milestoneId: m.id }) })),
                            { type: "separator" as const },
                            { label: "Dependências…", icon: <Link2 />, onSelect: () => setDeps(item) },
                          ]}
                        />
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
              <QuickAdd projectId={projectId} horizon={h} />
            </section>
          );
        })}
      </div>

      <DependenciesDialog
        item={deps}
        candidates={optimistic.filter((i) => i.id !== deps?.id)}
        onClose={() => setDeps(null)}
        onSave={(ids) => {
          if (deps) plan(deps, { dependsOn: ids });
          setDeps(null);
        }}
      />
    </LayoutGroup>
  );
}

function QuickAdd({ projectId, horizon }: { projectId: string; horizon: Horizon }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, start] = useTransition();
  const toast = useToast();
  const submit = () =>
    start(async () => {
      const result = await addRoadmapItem(projectId, { name, horizon, priority: "important", effort: null });
      if (!result.ok) {
        toast.show({ tone: "error", title: result.error });
        return;
      }
      setName("");
    });

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex w-fit items-center gap-1.5 rounded-sm py-1 text-caption tracking-normal text-fg-subtle transition-colors hover:text-fg-strong">
        <Plus className="size-3.5" aria-hidden />
        Adicionar em {HORIZON_LABELS[horizon]}
      </button>
    );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) submit();
      }}
      className="flex flex-col gap-2"
    >
      <input
        autoFocus
        value={name}
        maxLength={140}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        onBlur={() => !name.trim() && setOpen(false)}
        placeholder="Nome do item"
        aria-label={`Novo item em ${HORIZON_LABELS[horizon]}`}
        className="h-9 w-full rounded-sm bg-surface-2/70 px-3 text-body-sm text-fg-strong shadow-[inset_0_0_0_1px_var(--color-line-2)] outline-none placeholder:text-fg-subtle focus:shadow-[inset_0_0_0_1px_rgb(215_196_133/0.5)]"
      />
      <span className="text-caption tracking-normal text-fg-subtle">{saving ? "Salvando…" : "Enter para adicionar · Esc para fechar"}</span>
    </form>
  );
}

function DependenciesDialog({ item, candidates, onClose, onSave }: { item: RoadmapItem | null; candidates: RoadmapItem[]; onClose: () => void; onSave: (ids: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [lastItem, setLastItem] = useState<string | null>(null);
  if (item && item.id !== lastItem) {
    setLastItem(item.id);
    setSelected(item.dependsOn);
  }
  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title="Dependências"
      description={item ? `O que precisa estar concluído antes de "${item.name}"?` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => onSave(selected)}>
            Salvar
          </Button>
        </>
      }
    >
      {candidates.length === 0 ? (
        <p className="text-body-sm text-fg-muted">Não há outros itens no roadmap.</p>
      ) : (
        <ul className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
          {candidates.map((c) => (
            <li key={c.id}>
              <Checkbox
                label={c.name}
                description={`${HORIZON_LABELS[c.horizon]} · ${FEATURE_STATUS_LABELS[c.status]}`}
                checked={selected.includes(c.id)}
                onChange={(e) => setSelected((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))}
              />
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
