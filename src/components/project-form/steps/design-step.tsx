"use client";

import { AnimatePresence, motion } from "motion/react";
import { Link2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { Input, Textarea } from "@/components/ui/input";
import { ASSET_AVAILABILITY, ASSET_AVAILABILITY_LABELS } from "@/domain/project";
import type { ProjectFormValues, ReferenceDraft } from "@/domain/project-form";
import { FieldGroup, StepHeader } from "../step-header";
import { newKey, type StepProps } from "../types";

const ASSETS: { key: "hasVisualIdentity" | "hasLogo" | "hasBrandManual"; label: string }[] = [
  { key: "hasVisualIdentity", label: "Possui identidade visual?" },
  { key: "hasLogo", label: "Possui logo?" },
  { key: "hasBrandManual", label: "Possui manual de marca?" },
];

const availabilityOptions = ASSET_AVAILABILITY.map((v) => ({ value: v, label: ASSET_AVAILABILITY_LABELS[v] }));

export function DesignStep({ values, set, errors, counter }: StepProps & { counter: string }) {
  const refs = values.references;
  const update = (index: number, patch: Partial<ReferenceDraft>) => set("references", refs.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const add = () => set("references", [...refs, { key: newKey(), name: "", url: "", description: "" }]);
  const remove = (index: number) => set("references", refs.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col gap-9">
      <StepHeader
        counter={counter}
        title="Como esse projeto deve ser?"
        description="A forma também é decisão. Registre o que já existe de marca, onde buscar inspiração e o que evitar."
      />

      <section className="flex flex-col divide-y divide-line overflow-hidden rounded-lg bg-surface/60 shadow-[inset_0_0_0_1px_var(--color-line)]" aria-label="Ativos de marca">
        {ASSETS.map((asset) => (
          <div key={asset.key} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-body-sm font-medium text-fg sm:flex-1">{asset.label}</p>
            <div className="sm:w-[340px]">
              <ChoiceGroup
                size="sm"
                clearable
                aria-label={asset.label}
                options={availabilityOptions}
                value={values[asset.key] || null}
                onChange={(v) => set(asset.key, (v ?? "") as ProjectFormValues[typeof asset.key])}
              />
            </div>
          </div>
        ))}
      </section>

      <FieldGroup title="Referências">
        <FormField prompt label="Quais referências visuais existem?" optional error={errors.visualReferencesNotes}>
          <Textarea value={values.visualReferencesNotes} onChange={(e) => set("visualReferencesNotes", e.target.value)} placeholder="Produtos, marcas, estilos, movimentos — o que inspira este projeto." minRows={3} />
        </FormField>

        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {refs.map((ref, index) => (
              <motion.div
                key={ref.key}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0, transition: { duration: 0.18 } }}
                transition={{ duration: 0.26, ease: [0.25, 1, 0.5, 1] }}
                className="overflow-hidden"
              >
                <div className="flex gap-3 rounded-lg bg-surface/70 p-3 shadow-[inset_0_0_0_1px_var(--color-line)] sm:p-4">
                  <span className="mt-2 flex size-6 shrink-0 items-center justify-center rounded-xs bg-sunken text-fg-subtle shadow-[inset_0_0_0_1px_var(--color-line)]">
                    <Link2 className="size-3.5" aria-hidden />
                  </span>
                  <div className="grid min-w-0 flex-1 gap-2.5 sm:grid-cols-2">
                    <FormField label={<span className="sr-only">Nome da referência {index + 1}</span>} error={errors[`references.${index}.name`]} className="gap-0">
                      <Input value={ref.name} onChange={(e) => update(index, { name: e.target.value })} placeholder="Nome" autoComplete="off" className="font-medium" />
                    </FormField>
                    <FormField label={<span className="sr-only">URL da referência {index + 1}</span>} error={errors[`references.${index}.url`]} className="gap-0">
                      <Input value={ref.url} onChange={(e) => update(index, { url: e.target.value })} placeholder="https://" inputMode="url" autoComplete="off" spellCheck={false} className="font-mono text-[0.8125rem]" />
                    </FormField>
                    <Textarea
                      aria-label={`Descrição da referência ${index + 1}`}
                      value={ref.description}
                      onChange={(e) => update(index, { description: e.target.value })}
                      placeholder="O que chama atenção nesta referência?"
                      minRows={1}
                      className="bg-transparent py-2 text-body-sm shadow-none hover:shadow-[inset_0_0_0_1px_var(--color-line)] sm:col-span-2"
                    />
                  </div>
                  <IconButton label="Remover referência" size="sm" tone="danger" onClick={() => remove(index)} className="mt-1.5">
                    <Trash2 />
                  </IconButton>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div>
            <Button variant="secondary" size="sm" leading={<Plus />} onClick={add}>
              Adicionar referência
            </Button>
          </div>
        </div>
      </FieldGroup>

      <FieldGroup title="Sensação">
        <FormField prompt label="Qual sensação o produto deve transmitir?" optional error={errors.desiredFeeling}>
          <Textarea value={values.desiredFeeling} onChange={(e) => set("desiredFeeling", e.target.value)} placeholder="Ex.: precisão, calma, confiança, velocidade…" minRows={2} />
        </FormField>
        <FormField prompt label="Existe algum estilo que deseja evitar?" optional error={errors.stylesToAvoid}>
          <Textarea value={values.stylesToAvoid} onChange={(e) => set("stylesToAvoid", e.target.value)} placeholder="O que não combina com este projeto." minRows={2} />
        </FormField>
      </FieldGroup>
    </div>
  );
}
