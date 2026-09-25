"use client";

import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/input";
import { FieldGroup, StepHeader } from "../step-header";
import type { StepProps } from "../types";

export function ContextStep({ values, set, errors, counter }: StepProps & { counter: string }) {
  return (
    <div className="flex flex-col gap-9">
      <StepHeader
        counter={counter}
        title="Por que este projeto existe?"
        description="Antes do que construir, o porquê. Escreva com calma — é isto que você vai querer reler daqui a dois anos."
      />

      <div className="flex flex-col gap-8">
        <FormField prompt label="Qual problema deseja resolver?" optional error={errors.problem}>
          <Textarea value={values.problem} onChange={(e) => set("problem", e.target.value)} placeholder="Descreva a dor, a lacuna ou a oportunidade que motivou o projeto." minRows={4} />
        </FormField>

        <div className="relative -mx-4 rounded-lg bg-identity/40 px-4 py-5 shadow-[inset_0_0_0_1px_rgb(147_166_216/0.12)] sm:-mx-5 sm:px-5">
          <FormField prompt label="Qual é o objetivo principal?" required error={errors.primaryGoal} hint="Se o projeto só pudesse alcançar uma coisa, qual seria?">
            <Textarea value={values.primaryGoal} onChange={(e) => set("primaryGoal", e.target.value)} placeholder="Ex.: Reduzir pela metade o tempo de separação de pedidos no armazém." minRows={3} />
          </FormField>
        </div>

        <FormField prompt label="Quais são os objetivos secundários?" optional error={errors.secondaryGoals}>
          <Textarea value={values.secondaryGoals} onChange={(e) => set("secondaryGoals", e.target.value)} placeholder="Um por linha, se preferir." minRows={3} />
        </FormField>
      </div>

      <FieldGroup title="Pessoas">
        <div className="grid gap-8 md:grid-cols-2 md:gap-6">
          <FormField prompt label="Quem é o público?" optional error={errors.audience}>
            <Textarea value={values.audience} onChange={(e) => set("audience", e.target.value)} placeholder="Para quem o projeto gera valor." minRows={3} />
          </FormField>
          <FormField prompt label="Quem utilizará?" optional error={errors.endUsers}>
            <Textarea value={values.endUsers} onChange={(e) => set("endUsers", e.target.value)} placeholder="Quem vai operar no dia a dia." minRows={3} />
          </FormField>
        </div>
      </FieldGroup>

      <FieldGroup title="Resultado">
        <FormField prompt label="Qual resultado você espera alcançar?" optional error={errors.expectedOutcome}>
          <Textarea value={values.expectedOutcome} onChange={(e) => set("expectedOutcome", e.target.value)} minRows={3} />
        </FormField>
        <FormField prompt label="Como saberemos que o projeto deu certo?" optional error={errors.successCriteria} hint="Sinais concretos: números, comportamentos, marcos.">
          <Textarea value={values.successCriteria} onChange={(e) => set("successCriteria", e.target.value)} minRows={3} />
        </FormField>
      </FieldGroup>
    </div>
  );
}
