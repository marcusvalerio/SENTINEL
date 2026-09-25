"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, ChevronDown, Flag, MoreHorizontal, PencilLine, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { PRIORITY_TONE, PriorityPicker } from "@/components/project-form/priority-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/choice";
import { Dropdown } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { MILESTONE_STATUSES, MILESTONE_STATUS_LABELS, milestoneDueState, type MilestoneInput, type MilestoneStatus } from "@/domain/milestones";
import { FEATURE_PRIORITY_LABELS, FEATURE_STATUS_LABELS, type FeaturePriority, type FeatureStatus } from "@/domain/project";
import { cn } from "@/lib/cn";
import { dayKey, formatDate } from "@/lib/format";
import { createMilestone, deleteMilestone, setMilestoneStatus, updateMilestone } from "@/server/milestones/actions";

export type MilestoneView = {
  id: string;
  name: string;
  description: string | null;
  status: MilestoneStatus;
  priority: FeaturePriority;
  startedOn: string | null;
  dueOn: string | null;
  completedAt: string | null;
  progress: number;
  featureIds: string[];
};

export type FeatureOption = { id: string; name: string; status: FeatureStatus; milestoneId: string | null };

export const MILESTONE_TONE: Record<MilestoneStatus, string> = {
  planned: "bg-fg-subtle",
  active: "bg-[#7fb0e8]",
  completed: "bg-success",
  paused: "bg-warning",
  cancelled: "bg-transparent shadow-[inset_0_0_0_1.5px_var(--color-fg-subtle)]",
};

const EMPTY: MilestoneInput = { name: "", description: "", status: "planned", priority: "important", startedOn: "", dueOn: "", featureIds: [] };

function DueLabel({ m }: { m: MilestoneView }) {
  const state = milestoneDueState(m, dayKey(new Date()));
  if (m.status === "completed" && m.completedAt) return <span className="text-success">Concluído em {formatDate(m.completedAt)}</span>;
  if (!m.dueOn) return <span className="text-fg-subtle">Sem data prevista</span>;
  return (
    <span className={cn(state === "overdue" && "text-danger", state === "soon" && "text-warning", state === "on_track" && "text-fg-muted", state === "done" && "text-fg-subtle")}>
      {state === "overdue" ? "Atrasado · previsto " : "Previsto "}
      {formatDate(m.dueOn)}
    </span>
  );
}

export function MilestoneBoard({ projectId, milestones, features }: { projectId: string; milestones: MilestoneView[]; features: FeatureOption[] }) {
  const [editing, setEditing] = useState<{ id: string | null; values: MilestoneInput } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<MilestoneView | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [, startTransition] = useTransition();
  const toast = useToast();

  const open = (m?: MilestoneView) => {
    setErrors({});
    setEditing(
      m
        ? { id: m.id, values: { name: m.name, description: m.description ?? "", status: m.status, priority: m.priority, startedOn: m.startedOn ?? "", dueOn: m.dueOn ?? "", featureIds: m.featureIds } }
        : { id: null, values: { ...EMPTY } },
    );
  };
  const set = <K extends keyof MilestoneInput>(key: K, value: MilestoneInput[K]) => setEditing((e) => (e ? { ...e, values: { ...e.values, [key]: value } } : e));

  const save = () => {
    if (!editing) return;
    startSaving(async () => {
      const result = editing.id ? await updateMilestone(projectId, editing.id, editing.values) : await createMilestone(projectId, editing.values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) toast.show({ tone: "error", title: "Não foi possível salvar", description: result.error });
        return;
      }
      toast.show({ title: editing.id ? "Milestone atualizado" : "Milestone criado", description: editing.id ? undefined : "Ele já entrou na timeline do projeto." });
      setEditing(null);
    });
  };

  const changeStatus = (m: MilestoneView, status: MilestoneStatus) =>
    startTransition(async () => {
      const result = await setMilestoneStatus(projectId, m.id, status);
      toast.show(result.ok ? { title: `${m.name}: ${MILESTONE_STATUS_LABELS[status]}` } : { tone: "error", title: "Não foi possível alterar", description: result.error });
    });

  const remove = () => {
    const m = deleting;
    if (!m) return;
    setDeleting(null);
    startTransition(async () => {
      const result = await deleteMilestone(projectId, m.id);
      toast.show(result.ok ? { title: "Milestone removido", description: "As funcionalidades vinculadas continuam no escopo." } : { tone: "error", title: "Não foi possível remover", description: result.error });
    });
  };

  const selectedFeatures = new Set(editing?.values.featureIds ?? []);

  return (
    <div className="flex flex-col gap-6">
      {milestones.length === 0 ? (
        <EmptyState
          icon={<Flag />}
          title="Nenhum milestone definido."
          description="Milestones dividem o projeto em etapas com data. Vincule funcionalidades a cada um para medir o avanço real."
          action={
            <Button variant="primary" size="sm" leading={<Plus />} onClick={() => open()}>
              Criar milestone
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" leading={<Plus />} onClick={() => open()}>
              Novo milestone
            </Button>
          </div>
          <ol className="relative flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {milestones.map((m, index) => {
                const linked = features.filter((f) => f.milestoneId === m.id);
                const isOpen = expanded === m.id;
                return (
                  <motion.li
                    key={m.id}
                    id={`milestone-${m.id}`}
                    layout="position"
                    initial={{ opacity: 0, y: 8, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
                    className="scroll-mt-24"
                  >
                    <article className={cn("rounded-lg bg-surface/70 shadow-[inset_0_0_0_1px_var(--color-line)] transition-shadow target:shadow-[inset_0_0_0_1px_rgb(215_196_133/0.5)]", m.status === "active" && "shadow-[inset_0_0_0_1px_rgb(127_176_232/0.35)]", m.status === "cancelled" && "opacity-60")}>
                      <div className="flex items-start gap-4 p-4 sm:p-5">
                        <span className="font-mono mt-1 w-6 shrink-0 text-[0.6875rem] text-fg-subtle">{String(index + 1).padStart(2, "0")}</span>
                        <div className="flex min-w-0 flex-1 flex-col gap-3">
                          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                            <div className="flex min-w-0 flex-col gap-1">
                              <h3 className={cn("font-display text-h4 font-medium text-fg-strong", m.status === "cancelled" && "line-through decoration-fg-subtle")}>{m.name}</h3>
                              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption tracking-normal">
                                <span className="flex items-center gap-1.5 text-fg">
                                  <span className={cn("size-1.5 rounded-full", MILESTONE_TONE[m.status])} aria-hidden />
                                  {MILESTONE_STATUS_LABELS[m.status]}
                                </span>
                                <span className="flex items-center gap-1.5 text-fg-muted">
                                  <span className={cn("size-1.5 rounded-full", PRIORITY_TONE[m.priority])} aria-hidden />
                                  {FEATURE_PRIORITY_LABELS[m.priority]}
                                </span>
                                <span className="flex items-center gap-1.5" suppressHydrationWarning>
                                  <CalendarClock className="size-3 text-fg-subtle" aria-hidden />
                                  <DueLabel m={m} />
                                </span>
                              </p>
                            </div>
                            <Dropdown
                              width={220}
                              trigger={({ ref, toggle, ...aria }) => (
                                <button ref={ref} type="button" onClick={toggle} {...aria} aria-label={`Ações para ${m.name}`} className="-mt-1 -mr-1.5 flex size-8 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg-strong">
                                  <MoreHorizontal className="size-4" />
                                </button>
                              )}
                              items={[
                                { type: "label", label: "Status" },
                                ...MILESTONE_STATUSES.map((s) => ({ label: MILESTONE_STATUS_LABELS[s], selected: m.status === s, onSelect: () => changeStatus(m, s) })),
                                { type: "separator" as const },
                                { label: "Editar", icon: <PencilLine />, onSelect: () => open(m) },
                                { label: "Excluir", icon: <Trash2 />, tone: "danger" as const, onSelect: () => setDeleting(m) },
                              ]}
                            />
                          </div>
                          {m.description && <p className="max-w-[70ch] text-body-sm whitespace-pre-line text-fg-muted">{m.description}</p>}
                          <div className="flex items-center gap-4">
                            <Progress value={m.progress} size="sm" className="flex-1" label={`Progresso de ${m.name}`} tone={m.status === "completed" ? "accent" : "identity"} />
                            <span className="font-numeric w-10 text-right text-body-sm text-fg">{m.progress}%</span>
                          </div>
                          {linked.length > 0 && (
                            <button type="button" onClick={() => setExpanded(isOpen ? null : m.id)} aria-expanded={isOpen} className="flex w-fit items-center gap-1.5 text-caption tracking-normal text-fg-muted transition-colors hover:text-fg-strong">
                              <ChevronDown className={cn("size-3.5 transition-transform duration-200", isOpen && "rotate-180")} aria-hidden />
                              {linked.filter((f) => f.status === "done").length} de {linked.length} funcionalidades concluídas
                            </button>
                          )}
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-1.5 overflow-hidden">
                                {linked.map((f) => (
                                  <li key={f.id} className="flex items-center gap-2 text-body-sm">
                                    <span className={cn("size-1.5 rounded-full", f.status === "done" ? "bg-accent" : f.status === "in_progress" ? "bg-[#93a6d8]" : "bg-fg-subtle")} aria-hidden />
                                    <span className={f.status === "done" ? "text-fg-muted line-through decoration-fg-subtle/60" : "text-fg"}>{f.name}</span>
                                    <span className="ml-auto text-caption tracking-normal text-fg-subtle">{FEATURE_STATUS_LABELS[f.status]}</span>
                                  </li>
                                ))}
                              </motion.ul>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </article>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ol>
        </>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        size="lg"
        title={editing?.id ? "Editar milestone" : "Novo milestone"}
        description="Uma etapa do projeto com começo, previsão e funcionalidades que a compõem."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={save} loading={saving}>
              {editing?.id ? "Salvar" : "Criar milestone"}
            </Button>
          </>
        }
      >
        {editing && (
          <form
            className="grid gap-5 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <FormField label="Nome" required error={errors.name} className="sm:col-span-2">
              <Input value={editing.values.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: MVP para o primeiro cliente" autoComplete="off" data-autofocus />
            </FormField>
            <FormField label="Descrição" optional error={errors.description} className="sm:col-span-2">
              <Textarea value={editing.values.description ?? ""} onChange={(e) => set("description", e.target.value)} minRows={2} placeholder="O que precisa ser verdade quando este milestone terminar?" />
            </FormField>
            <FormField label="Status" error={errors.status}>
              <Select value={editing.values.status} onChange={(e) => set("status", e.target.value as MilestoneStatus)}>
                {MILESTONE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {MILESTONE_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Prioridade" error={errors.priority}>
              <div>
                <PriorityPicker value={editing.values.priority as FeaturePriority} onChange={(p) => set("priority", p)} label="Prioridade do milestone" />
              </div>
            </FormField>
            <FormField label="Data inicial" optional error={errors.startedOn}>
              <Input type="date" value={editing.values.startedOn ?? ""} onChange={(e) => set("startedOn", e.target.value)} className="font-numeric" />
            </FormField>
            <FormField label="Data prevista" optional error={errors.dueOn}>
              <Input type="date" value={editing.values.dueOn ?? ""} onChange={(e) => set("dueOn", e.target.value)} className="font-numeric" />
            </FormField>
            <fieldset className="flex flex-col gap-2 sm:col-span-2">
              <legend className="mb-2 text-label font-medium text-fg">Funcionalidades relacionadas</legend>
              {features.length === 0 ? (
                <p className="text-body-sm text-fg-subtle">Este projeto ainda não tem funcionalidades no escopo.</p>
              ) : (
                <div className="flex max-h-56 flex-col gap-2.5 overflow-y-auto rounded-md p-3 shadow-[inset_0_0_0_1px_var(--color-line)]">
                  {features.map((f) => {
                    const elsewhere = f.milestoneId && f.milestoneId !== editing.id;
                    return (
                      <Checkbox
                        key={f.id}
                        checked={selectedFeatures.has(f.id)}
                        onChange={(e) => set("featureIds", e.target.checked ? [...(editing.values.featureIds ?? []), f.id] : (editing.values.featureIds ?? []).filter((id) => id !== f.id))}
                        label={f.name}
                        description={elsewhere ? `Hoje em outro milestone — será movida para este.` : FEATURE_STATUS_LABELS[f.status]}
                      />
                    );
                  })}
                </div>
              )}
            </fieldset>
            <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Excluir milestone?"
        description={`“${deleting?.name ?? ""}” será removido. As funcionalidades vinculadas continuam no escopo, sem milestone.`}
        confirmLabel="Excluir"
      />
    </div>
  );
}
