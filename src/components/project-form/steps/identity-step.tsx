"use client";

import {
  AppWindow,
  BookOpen,
  Boxes,
  Briefcase,
  Cloud,
  FlaskConical,
  Globe,
  GraduationCap,
  Lightbulb,
  PenTool,
  Shapes,
  Smartphone,
} from "lucide-react";
import type { ReactNode } from "react";
import { ChoiceGroup } from "@/components/ui/choice";
import { FormField } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { STATUS_COLOR } from "@/components/ui/status";
import { LIMITS } from "@/domain/project-form";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, PROJECT_TYPES, PROJECT_TYPE_LABELS, type ProjectType } from "@/domain/project";
import { FieldGroup, StepHeader } from "../step-header";
import type { StepProps } from "../types";

export const TYPE_ICONS: Record<ProjectType, ReactNode> = {
  saas: <Cloud />,
  system: <Boxes />,
  web_app: <AppWindow />,
  mobile_app: <Smartphone />,
  website: <Globe />,
  branding: <PenTool />,
  study: <BookOpen />,
  academic: <GraduationCap />,
  professional: <Briefcase />,
  experiment: <FlaskConical />,
  idea: <Lightbulb />,
  other: <Shapes />,
};

export function IdentityStep({ values, set, errors, counter }: StepProps & { counter: string }) {
  return (
    <div className="flex flex-col gap-9">
      <StepHeader
        counter={counter}
        title="Como este projeto se chama?"
        description="Todo projeto começa com um nome. Registre como ele é conhecido, o que ele é e em que momento está."
      />

      <div className="flex flex-col gap-6">
        <FormField label="Nome do projeto" required error={errors.name}>
          <Input
            name="name"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Ex.: Lunar WMS"
            autoComplete="off"
            autoFocus
            maxLength={LIMITS.name + 20}
            className="h-14 px-4 font-display text-h3 tracking-[-0.015em] max-sm:text-h3"
          />
        </FormField>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField label="Nome interno / codinome" optional hint="Como você se refere a ele no dia a dia." error={errors.codename}>
            <Input
              name="codename"
              value={values.codename}
              onChange={(e) => set("codename", e.target.value.toUpperCase())}
              placeholder="LUNAR.WMS"
              autoComplete="off"
              spellCheck={false}
              className="font-mono tracking-wide uppercase"
            />
          </FormField>
          <FormField label="Categoria" optional hint="Área, cliente ou linha de trabalho." error={errors.category}>
            <Input name="category" value={values.category} onChange={(e) => set("category", e.target.value)} placeholder="Ex.: Logística" autoComplete="off" />
          </FormField>
        </div>

        <FormField label="Descrição curta" optional error={errors.summary} counter={{ value: values.summary.length, max: LIMITS.summary }}>
          <Textarea
            name="summary"
            value={values.summary}
            onChange={(e) => set("summary", e.target.value)}
            placeholder="Uma ou duas frases que expliquem o projeto para alguém que nunca ouviu falar dele."
            minRows={2}
          />
        </FormField>
      </div>

      <FieldGroup title="Natureza">
        <FormField label="Tipo" required error={errors.type}>
          <ChoiceGroup
            options={PROJECT_TYPES.map((t) => ({ value: t, label: PROJECT_TYPE_LABELS[t], icon: TYPE_ICONS[t] }))}
            value={values.type || null}
            onChange={(v) => set("type", v ?? "")}
            columns={4}
          />
        </FormField>

        <FormField label="Status inicial" error={errors.status} hint="Em que momento o projeto está hoje.">
          <ChoiceGroup
            options={PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s], tone: STATUS_COLOR[s] }))}
            value={values.status}
            onChange={(v) => v && set("status", v)}
            columns={4}
          />
        </FormField>
      </FieldGroup>

      <FieldGroup title="Origem">
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField label="Data de início" optional error={errors.startedOn}>
            <Input name="startedOn" type="date" value={values.startedOn} onChange={(e) => set("startedOn", e.target.value)} className="font-numeric" />
          </FormField>
          <FormField label="Responsável" optional error={errors.leadName}>
            <Input name="leadName" value={values.leadName} onChange={(e) => set("leadName", e.target.value)} placeholder="Quem conduz o projeto" autoComplete="name" />
          </FormField>
        </div>
      </FieldGroup>
    </div>
  );
}
