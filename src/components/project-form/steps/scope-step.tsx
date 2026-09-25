"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowUp, ListPlus, Plus, Trash2 } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { Input, Textarea } from "@/components/ui/input";
import { FEATURE_PRIORITIES, FEATURE_PRIORITY_LABELS } from "@/domain/project";
import type { FeatureDraft } from "@/domain/project-form";
import { PRIORITY_TONE, PriorityPicker } from "../priority-picker";
import { FieldGroup, StepHeader } from "../step-header";
import { newKey, type StepProps } from "../types";

export function ScopeStep({ values, set, errors, counter }: StepProps & { counter: string }) {
  const listRef = useRef<HTMLOListElement>(null);
  const features = values.features;

  const update = (index: number, patch: Partial<FeatureDraft>) =>
    set("features", features.map((f, i) => (i === index ? { ...f, ...patch } : f)));

  const add = (focus = true) => {
    set("features", [...features, { key: newKey(), name: "", description: "", priority: "important" }]);
    if (focus) {
      requestAnimationFrame(() => {
        const inputs = listRef.current?.querySelectorAll<HTMLInputElement>("input[data-feature-name]");
        inputs?.[inputs.length - 1]?.focus();
      });
    }
  };

  const remove = (index: number) => set("features", features.filter((_, i) => i !== index));

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= features.length) return;
    const next = [...features];
    [next[index], next[target]] = [next[target]!, next[index]!];
    set("features", next);
  };

  const counts = FEATURE_PRIORITIES.map((p) => ({ p, n: features.filter((f) => f.priority === p).length })).filter((c) => c.n > 0);

  return (
    <div className="flex flex-col gap-9">
      <StepHeader
        counter={counter}
        title="O que precisa ser construído?"
        description="Liste as funcionalidades que dão forma ao projeto. Elas são a base do progresso real — mais tarde viram requisitos, tarefas e roadmap."
      />

      <section aria-labelledby="features-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="features-heading" className="font-display text-h4 font-medium text-fg-strong">
            Funcionalidades
            <span className="font-numeric ml-2 text-body-sm font-normal text-fg-subtle">{features.length}</span>
          </h2>
          {counts.length > 0 && (
            <div className="flex flex-wrap items-center gap-3" aria-label="Resumo por prioridade">
              {counts.map(({ p, n }) => (
                <span key={p} className="flex items-center gap-1.5 text-caption tracking-normal text-fg-muted">
                  <span className={`size-1.5 rounded-full ${PRIORITY_TONE[p]}`} aria-hidden />
                  <span className="font-numeric">{n}</span> {FEATURE_PRIORITY_LABELS[p].toLowerCase()}
                  {n > 1 ? "s" : ""}
                </span>
              ))}
            </div>
          )}
        </div>

        {features.length === 0 ? (
          <button
            type="button"
            onClick={() => add()}
            className="group flex flex-col items-center gap-3 rounded-lg px-6 py-10 text-center shadow-[inset_0_0_0_1px_var(--color-line-2)] transition-colors [background-image:repeating-linear-gradient(135deg,transparent_0_10px,rgb(212_207_214/0.015)_10px_11px)] hover:bg-surface/60"
          >
            <span className="flex size-10 items-center justify-center rounded-md bg-surface-2 text-fg-muted shadow-[inset_0_0_0_1px_var(--color-line-2)] transition-colors group-hover:text-accent">
              <ListPlus className="size-5 stroke-[1.5]" aria-hidden />
            </span>
            <span className="text-body-sm font-medium text-fg-strong">Adicionar a primeira funcionalidade</span>
            <span className="max-w-sm text-body-sm text-fg-muted">Comece pelo essencial: o que o projeto precisa fazer para existir?</span>
          </button>
        ) : (
          <ol ref={listRef} className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {features.map((feature, index) => (
                <motion.li
                  key={feature.key}
                  layout="position"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.18 } }}
                  transition={{ duration: 0.26, ease: [0.25, 1, 0.5, 1] }}
                  className="overflow-hidden"
                >
                  <div className="group/feature flex gap-3 rounded-lg bg-surface/70 p-3 shadow-[inset_0_0_0_1px_var(--color-line)] transition-shadow focus-within:shadow-[inset_0_0_0_1px_var(--color-line-2)] sm:p-4">
                    <span className="font-mono mt-2.5 w-5 shrink-0 text-[0.6875rem] text-fg-subtle">{String(index + 1).padStart(2, "0")}</span>
                    <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start">
                        <FormField label={<span className="sr-only">Nome da funcionalidade {index + 1}</span>} error={errors[`features.${index}.name`]} className="flex-1 gap-0">
                          <Input
                            data-feature-name
                            value={feature.name}
                            onChange={(e) => update(index, { name: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                                e.preventDefault();
                                if (feature.name.trim()) add();
                              }
                            }}
                            placeholder="Nome da funcionalidade"
                            autoComplete="off"
                            className="font-medium"
                          />
                        </FormField>
                        <PriorityPicker value={feature.priority} onChange={(priority) => update(index, { priority })} label={`Prioridade de ${feature.name || `funcionalidade ${index + 1}`}`} />
                      </div>
                      <Textarea
                        aria-label={`Descrição da funcionalidade ${index + 1}`}
                        value={feature.description}
                        onChange={(e) => update(index, { description: e.target.value })}
                        placeholder="Descrição (opcional) — o que ela faz e por que importa."
                        minRows={1}
                        className="bg-transparent py-2 text-body-sm shadow-none hover:shadow-[inset_0_0_0_1px_var(--color-line)]"
                      />
                    </div>
                    <div className="-mr-1 flex shrink-0 flex-col items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within/feature:opacity-100 sm:group-hover/feature:opacity-100">
                      <IconButton label="Mover para cima" size="sm" onClick={() => move(index, -1)} disabled={index === 0} showTooltip={false}>
                        <ArrowUp />
                      </IconButton>
                      <IconButton label="Mover para baixo" size="sm" onClick={() => move(index, 1)} disabled={index === features.length - 1} showTooltip={false}>
                        <ArrowDown />
                      </IconButton>
                      <IconButton label="Remover funcionalidade" size="sm" tone="danger" onClick={() => remove(index)} showTooltip={false}>
                        <Trash2 />
                      </IconButton>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        )}

        {features.length > 0 && (
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" leading={<Plus />} onClick={() => add()} className="-ml-2.5">
              Adicionar funcionalidade
            </Button>
            <span className="hidden text-caption tracking-normal text-fg-subtle sm:inline">ou pressione Enter no nome</span>
          </div>
        )}
      </section>

      <FieldGroup title="Limites e dependências">
        <FormField prompt label="Existe alguma funcionalidade obrigatória?" optional error={errors.mandatoryFeatures}>
          <Textarea value={values.mandatoryFeatures} onChange={(e) => set("mandatoryFeatures", e.target.value)} placeholder="Algo sem o qual o projeto não faz sentido." minRows={2} />
        </FormField>
        <FormField prompt label="Existe alguma restrição técnica?" optional error={errors.technicalConstraints}>
          <Textarea value={values.technicalConstraints} onChange={(e) => set("technicalConstraints", e.target.value)} placeholder="Stack obrigatória, infraestrutura, legado, compliance…" minRows={2} />
        </FormField>
        <FormField prompt label="Existe alguma integração necessária?" optional error={errors.integrations}>
          <Textarea value={values.integrations} onChange={(e) => set("integrations", e.target.value)} placeholder="APIs, ERPs, gateways de pagamento, serviços externos…" minRows={2} />
        </FormField>
      </FieldGroup>
    </div>
  );
}
