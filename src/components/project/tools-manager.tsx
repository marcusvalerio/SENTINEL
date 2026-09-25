"use client";

import { AnimatePresence, motion } from "motion/react";
import { MoreHorizontal, PencilLine, Plus, Trash2, Wrench } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { MoneyInput } from "@/components/project-form/money-input";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { EMPTY_TOOL, TOOL_CATALOG, TOOL_CATEGORIES, TOOL_CATEGORY_LABELS, suggestCategory, type ToolCategory, type ToolInput } from "@/domain/tools";
import { centsToInput, formatDate, formatMoney } from "@/lib/format";
import { addTool, removeTool, updateTool } from "@/server/tools/actions";

export type ToolRow = {
  id: string;
  name: string;
  category: ToolCategory | null;
  purpose: string | null;
  plan: string | null;
  costCents: number | null;
  frequency: string | null;
  startedOn: string | null;
  endedOn: string | null;
  notes: string | null;
};

function toInput(tool: ToolRow): ToolInput {
  return {
    name: tool.name,
    category: tool.category ?? "",
    purpose: tool.purpose ?? "",
    plan: tool.plan ?? "",
    cost: centsToInput(tool.costCents),
    frequency: tool.frequency ?? "",
    startedOn: tool.startedOn ?? "",
    endedOn: tool.endedOn ?? "",
    notes: tool.notes ?? "",
  };
}

function period(tool: ToolRow) {
  if (!tool.startedOn && !tool.endedOn) return null;
  if (tool.startedOn && !tool.endedOn) return `desde ${formatDate(tool.startedOn)}`;
  if (!tool.startedOn) return `até ${formatDate(tool.endedOn)}`;
  return `${formatDate(tool.startedOn)} – ${formatDate(tool.endedOn)}`;
}

export function ToolsManager({ projectId, tools }: { projectId: string; tools: ToolRow[] }) {
  const [optimistic, removeOptimistic] = useOptimistic(tools, (state, id: string) => state.filter((t) => t.id !== id));
  const [editing, setEditing] = useState<{ id: string | null; values: ToolInput } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();
  const [, startRemoving] = useTransition();
  const toast = useToast();

  const registered = new Set(optimistic.map((t) => t.name.toLowerCase()));
  const suggestions = TOOL_CATALOG.filter((s) => !registered.has(s.name.toLowerCase()));
  const byCategory = TOOL_CATEGORIES.map((c) => ({ category: c, items: optimistic.filter((t) => (t.category ?? "other") === c) })).filter((g) => g.items.length);
  const monthly = optimistic.reduce((sum, t) => sum + (t.costCents ?? 0), 0);

  const open = (tool?: ToolRow) => {
    setErrors({});
    setEditing({ id: tool?.id ?? null, values: tool ? toInput(tool) : { ...EMPTY_TOOL } });
  };
  const set = <K extends keyof ToolInput>(key: K, value: ToolInput[K]) => setEditing((e) => (e ? { ...e, values: { ...e.values, [key]: value } } : e));

  const save = () => {
    if (!editing) return;
    startSaving(async () => {
      const result = editing.id ? await updateTool(projectId, editing.id, editing.values) : await addTool(projectId, editing.values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? { name: result.error });
        return;
      }
      toast.show({ title: editing.id ? "Ferramenta atualizada" : `${editing.values.name} registrada` });
      setEditing(null);
    });
  };

  const quickAdd = (name: string, purpose: string, category: ToolCategory) =>
    startSaving(async () => {
      const result = await addTool(projectId, { ...EMPTY_TOOL, name, purpose, category });
      toast.show(result.ok ? { title: `${name} registrada` } : { tone: "error", title: "Não foi possível registrar", description: result.error });
    });

  const remove = (tool: ToolRow) =>
    startRemoving(async () => {
      removeOptimistic(tool.id);
      const result = await removeTool(projectId, tool.id);
      if (!result.ok) toast.show({ tone: "error", title: "Não foi possível remover", description: result.error });
    });

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
      <div className="flex flex-col gap-8">
        {optimistic.length === 0 ? (
          <EmptyState
            compact
            icon={<Wrench />}
            title="Nenhuma ferramenta registrada."
            description="Registre o que foi usado para pensar, desenhar, construir e operar este projeto."
            action={
              <Button variant="secondary" size="sm" leading={<Plus />} onClick={() => open()}>
                Registrar ferramenta
              </Button>
            }
          />
        ) : (
          byCategory.map(({ category, items }) => (
            <section key={category} className="flex flex-col gap-3" aria-labelledby={`tools-${category}`}>
              <h2 id={`tools-${category}`} className="eyebrow flex items-center gap-2">
                {TOOL_CATEGORY_LABELS[category]}
                <span className="font-numeric text-fg-subtle">{items.length}</span>
              </h2>
              <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-lg bg-surface/60 shadow-[inset_0_0_0_1px_var(--color-line)]">
                <AnimatePresence initial={false}>
                  {items.map((tool) => (
                    <motion.li key={tool.id} layout="position" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sunken font-display text-body-sm font-semibold text-fg-muted shadow-[inset_0_0_0_1px_var(--color-line-2)]" aria-hidden>
                        {tool.name.slice(0, 2)}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="flex items-baseline gap-2">
                          <span className="text-body-sm font-medium text-fg-strong">{tool.name}</span>
                          {tool.plan && <span className="text-caption tracking-normal text-fg-subtle">{tool.plan}</span>}
                        </span>
                        <span className="truncate text-body-sm text-fg-muted">{tool.purpose ?? <span className="text-fg-subtle italic">Finalidade não informada</span>}</span>
                        {(period(tool) || tool.frequency) && (
                          <span className="truncate text-caption tracking-normal text-fg-subtle">{[period(tool), tool.frequency].filter(Boolean).join(" · ")}</span>
                        )}
                      </div>
                      {tool.costCents !== null && <span className="font-numeric hidden shrink-0 text-body-sm text-fg sm:inline">{formatMoney(tool.costCents)}</span>}
                      <Dropdown
                        width={180}
                        trigger={({ ref, toggle, ...aria }) => (
                          <button ref={ref} type="button" onClick={toggle} {...aria} aria-label={`Ações para ${tool.name}`} className="flex size-8 shrink-0 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg-strong">
                            <MoreHorizontal className="size-4" />
                          </button>
                        )}
                        items={[
                          { label: "Editar", icon: <PencilLine />, onSelect: () => open(tool) },
                          { label: "Remover", icon: <Trash2 />, tone: "danger", onSelect: () => remove(tool) },
                        ]}
                      />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ))
        )}
      </div>

      <aside className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-lg bg-surface p-5 shadow-[inset_0_0_0_1px_var(--color-line-2)]">
          <div className="flex items-baseline justify-between gap-3">
            <span className="eyebrow">Ferramentas</span>
            <span className="font-numeric font-display text-h3 text-fg-strong">{optimistic.length}</span>
          </div>
          {monthly > 0 && (
            <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
              <span className="text-body-sm text-fg-muted">Custo registrado</span>
              <span className="font-numeric text-body-sm text-fg-strong">{formatMoney(monthly)}</span>
            </div>
          )}
          <Button variant="primary" leading={<Plus />} onClick={() => open()}>
            Registrar ferramenta
          </Button>
        </div>

        {suggestions.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="eyebrow">Adicionar rapidamente</h3>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  disabled={saving}
                  onClick={() => quickAdd(s.name, s.purpose, s.category)}
                  className="flex h-7 items-center gap-1 rounded-full px-2.5 text-caption tracking-normal text-fg-muted shadow-[inset_0_0_0_1px_var(--color-line-2)] transition-colors hover:bg-surface-2 hover:text-fg-strong disabled:opacity-50"
                >
                  <Plus className="size-3" aria-hidden />
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Editar ferramenta" : "Registrar ferramenta"}
        description="Apenas o nome é obrigatório. O resto ajuda a lembrar como ela foi usada."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={save} loading={saving}>
              {editing?.id ? "Salvar" : "Registrar"}
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
            <FormField label="Nome" required error={errors.name}>
              <Input
                value={editing.values.name}
                onChange={(e) => {
                  set("name", e.target.value);
                  const guess = suggestCategory(e.target.value);
                  if (guess && !editing.values.category) set("category", guess);
                }}
                placeholder="Ex.: Figma"
                autoComplete="off"
                data-autofocus
              />
            </FormField>
            <FormField label="Categoria" optional error={errors.category}>
              <Select value={editing.values.category} onChange={(e) => set("category", e.target.value as ToolInput["category"])} placeholder="Sem categoria">
                {TOOL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {TOOL_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Finalidade" optional error={errors.purpose} className="sm:col-span-2">
              <Input value={editing.values.purpose} onChange={(e) => set("purpose", e.target.value)} placeholder="Para que foi usada" autoComplete="off" />
            </FormField>
            <FormField label="Plano" optional error={errors.plan}>
              <Input value={editing.values.plan} onChange={(e) => set("plan", e.target.value)} placeholder="Free, Pro, Team…" autoComplete="off" />
            </FormField>
            <FormField label="Custo" optional hint="Por mês, ou o valor que fizer sentido." error={errors.cost}>
              <MoneyInput value={editing.values.cost} onChange={(v) => set("cost", v)} />
            </FormField>
            <FormField label="Início do uso" optional error={errors.startedOn}>
              <Input type="date" value={editing.values.startedOn} onChange={(e) => set("startedOn", e.target.value)} className="font-numeric" />
            </FormField>
            <FormField label="Fim do uso" optional error={errors.endedOn}>
              <Input type="date" value={editing.values.endedOn} onChange={(e) => set("endedOn", e.target.value)} className="font-numeric" />
            </FormField>
            <FormField label="Frequência" optional error={errors.frequency}>
              <Input value={editing.values.frequency} onChange={(e) => set("frequency", e.target.value)} placeholder="Diária, semanal…" autoComplete="off" />
            </FormField>
            <FormField label="Observação" optional error={errors.notes} className="sm:col-span-2">
              <Textarea value={editing.values.notes} onChange={(e) => set("notes", e.target.value)} minRows={2} />
            </FormField>
            <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
          </form>
        )}
      </Modal>
    </div>
  );
}
