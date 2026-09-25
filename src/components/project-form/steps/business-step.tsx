"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { ChoiceGroup } from "@/components/ui/choice";
import { FormField } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { ENGAGEMENTS, ENGAGEMENT_LABELS } from "@/domain/project";
import { MoneyInput } from "../money-input";
import { FieldGroup, StepHeader } from "../step-header";
import type { StepProps } from "../types";

/** Fields that only make sense after a previous answer slide in beneath it. */
function Conditional({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.26, ease: [0.25, 1, 0.5, 1] }}
          className="overflow-hidden"
        >
          <div className="ml-0.5 border-l border-accent/30 pt-1 pl-4">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function BusinessStep({ values, set, errors, counter }: StepProps & { counter: string }) {
  return (
    <div className="flex flex-col gap-9">
      <StepHeader
        counter={counter}
        title="Qual é o contexto de negócio?"
        description="Para quem é, quanto custa e quando precisa estar pronto. Tudo aqui é opcional — registre o que já souber."
      />

      <div className="flex flex-col gap-4">
        <FormField label="É projeto pessoal ou para cliente?" optional error={errors.engagement}>
          <ChoiceGroup
            clearable
            columns={4}
            options={ENGAGEMENTS.map((e) => ({ value: e, label: ENGAGEMENT_LABELS[e] }))}
            value={values.engagement || null}
            onChange={(v) => set("engagement", v ?? "")}
          />
        </FormField>
        <Conditional show={values.engagement === "client" || values.engagement === "employer" || values.engagement === "partnership"}>
          <FormField label={values.engagement === "client" ? "Cliente" : "Organização"} optional error={errors.clientName}>
            <Input value={values.clientName} onChange={(e) => set("clientName", e.target.value)} placeholder="Nome" autoComplete="organization" />
          </FormField>
        </Conditional>
      </div>

      <FieldGroup title="Finanças">
        <div className="flex flex-col gap-4">
          <FormField label="Existe orçamento?" optional error={errors.hasBudget}>
            <div className="max-w-xs">
              <ChoiceGroup
                size="sm"
                clearable
                columns={2}
                options={[
                  { value: "yes", label: "Sim" },
                  { value: "no", label: "Não" },
                ]}
                value={values.hasBudget || null}
                onChange={(v) => set("hasBudget", (v ?? "") as "" | "yes" | "no")}
              />
            </div>
          </FormField>
          <Conditional show={values.hasBudget === "yes"}>
            <FormField label="Orçamento" optional error={errors.budget}>
              <div className="sm:max-w-[calc(50%-12px)]">
                <MoneyInput value={values.budget} onChange={(v) => set("budget", v)} />
              </div>
            </FormField>
          </Conditional>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField label="Investimento previsto" optional error={errors.investmentPlanned}>
            <MoneyInput value={values.investmentPlanned} onChange={(v) => set("investmentPlanned", v)} />
          </FormField>
          <FormField label="Investimento realizado" optional error={errors.investmentRealized}>
            <MoneyInput value={values.investmentRealized} onChange={(v) => set("investmentRealized", v)} />
          </FormField>
          <FormField label="Receita esperada" optional error={errors.expectedRevenue}>
            <MoneyInput value={values.expectedRevenue} onChange={(v) => set("expectedRevenue", v)} />
          </FormField>
        </div>

        <FormField label="Modelo de monetização" optional error={errors.monetizationModel}>
          <Textarea value={values.monetizationModel} onChange={(e) => set("monetizationModel", e.target.value)} placeholder="Assinatura, licença, projeto fechado, sem monetização…" minRows={2} />
        </FormField>
      </FieldGroup>

      <FieldGroup title="Tempo">
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField label="Prazo desejado" optional hint="Ex.: 3 meses, fim do semestre." error={errors.desiredDeadline}>
            <Input value={values.desiredDeadline} onChange={(e) => set("desiredDeadline", e.target.value)} placeholder="Em quanto tempo" autoComplete="off" />
          </FormField>
          <FormField label="Data desejada de lançamento" optional error={errors.launchTargetOn}>
            <Input type="date" value={values.launchTargetOn} onChange={(e) => set("launchTargetOn", e.target.value)} className="font-numeric" />
          </FormField>
        </div>
      </FieldGroup>
    </div>
  );
}
