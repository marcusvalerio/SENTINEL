"use client";

import { CircleAlert, Link2, PencilLine } from "lucide-react";
import type { ReactNode } from "react";
import { Code } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status";
import {
  ASSET_AVAILABILITY_LABELS,
  ENGAGEMENT_LABELS,
  FEATURE_PRIORITY_LABELS,
  PROJECT_TYPE_LABELS,
} from "@/domain/project";
import { FORM_STEPS, stepOfError, type FormErrors, type ProjectFormValues } from "@/domain/project-form";
import { formatDate, formatMoney, parseMoneyToCents } from "@/lib/format";
import { PRIORITY_TONE } from "../priority-picker";
import { StepHeader } from "../step-header";

type ReviewProps = { values: ProjectFormValues; errors: FormErrors; counter: string; onEdit: (step: number) => void; mode: "create" | "edit" };

function Empty() {
  return <span className="text-fg-subtle italic">Não informado</span>;
}

function Row({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="eyebrow mb-1.5">{label}</dt>
      <dd className="text-body-sm whitespace-pre-line text-fg">{children}</dd>
    </div>
  );
}

function money(value: string) {
  const cents = parseMoneyToCents(value);
  return cents === null || Number.isNaN(cents) ? null : formatMoney(cents);
}

function Section({ step, children, onEdit, errorCount }: { step: number; children: ReactNode; onEdit: (step: number) => void; errorCount: number }) {
  const meta = FORM_STEPS[step]!;
  return (
    <section className="grid gap-5 border-t border-line pt-6 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-8" aria-labelledby={`review-${meta.key}`}>
      <div className="flex items-start justify-between gap-3 sm:flex-col sm:justify-start">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[0.6875rem] text-fg-subtle">{String(step + 1).padStart(2, "0")}</span>
          <h2 id={`review-${meta.key}`} className="font-display text-h4 font-medium text-fg-strong">
            {meta.label}
          </h2>
          {errorCount > 0 && (
            <span className="mt-1 flex items-center gap-1.5 text-caption tracking-normal text-danger">
              <CircleAlert className="size-3.5" aria-hidden />
              {errorCount === 1 ? "1 pendência" : `${errorCount} pendências`}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="flex h-7 items-center gap-1.5 rounded-xs px-1.5 text-caption tracking-normal text-fg-muted transition-colors hover:bg-surface-2 hover:text-accent sm:-ml-1.5"
        >
          <PencilLine className="size-3.5" aria-hidden />
          Editar
        </button>
      </div>
      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

export function ReviewStep({ values: v, errors, counter, onEdit, mode }: ReviewProps) {
  const errorCount = (step: number) => Object.keys(errors).filter((path) => stepOfError(path) === step).length;
  const total = Object.keys(errors).length;
  const text = (value: string) => (value.trim() ? value.trim() : <Empty />);

  return (
    <div className="flex flex-col gap-8">
      <StepHeader
        counter={counter}
        title="Revisar projeto"
        description={
          mode === "create"
            ? "Confira o registro antes de criá-lo. Tudo pode ser editado depois — mas este é o retrato de como o projeto nasceu."
            : "Confira as alterações antes de salvar."
        }
      />

      {total > 0 && (
        <div role="alert" className="flex items-start gap-3 rounded-md bg-danger-soft px-4 py-3 text-body-sm text-danger shadow-[inset_0_0_0_1px_rgb(224_146_143/0.2)]">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {total === 1 ? "Há 1 campo" : `Há ${total} campos`} que {total === 1 ? "precisa" : "precisam"} de atenção. Use “Editar” na etapa indicada.
          </span>
        </div>
      )}

      {/* The birth certificate */}
      <div className="relative overflow-hidden rounded-lg bg-identity px-5 py-6 shadow-[inset_0_0_0_1px_rgb(147_166_216/0.16)] sm:px-7 sm:py-7">
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_left,black,transparent_70%)]" aria-hidden />
        <div className="relative flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {v.type && <span className="eyebrow text-[#b8c5ea]">{PROJECT_TYPE_LABELS[v.type]}</span>}
            {v.codename && <Code className="bg-canvas/40">{v.codename}</Code>}
          </div>
          <h2 className="font-display text-h2 font-medium tracking-[-0.02em] text-fg-strong sm:text-h1">{v.name.trim() || "Projeto sem nome"}</h2>
          {v.summary.trim() && <p className="max-w-[60ch] text-body text-fg">{v.summary.trim()}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={v.status} className="bg-canvas/40" />
            {v.startedOn && <span className="text-caption tracking-normal text-fg-muted">Início em {formatDate(v.startedOn, "long")}</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-7">
        <Section step={0} onEdit={onEdit} errorCount={errorCount(0)}>
          <Row label="Categoria">{text(v.category)}</Row>
          <Row label="Responsável">{text(v.leadName)}</Row>
        </Section>

        <Section step={1} onEdit={onEdit} errorCount={errorCount(1)}>
          <Row label="Objetivo principal" wide>
            {v.primaryGoal.trim() ? <span className="text-body text-fg-strong">{v.primaryGoal.trim()}</span> : <span className="text-danger">Obrigatório — ainda não informado</span>}
          </Row>
          <Row label="Problema" wide>{text(v.problem)}</Row>
          <Row label="Público">{text(v.audience)}</Row>
          <Row label="Quem utilizará">{text(v.endUsers)}</Row>
          {v.secondaryGoals.trim() && <Row label="Objetivos secundários" wide>{v.secondaryGoals.trim()}</Row>}
          {v.expectedOutcome.trim() && <Row label="Resultado esperado" wide>{v.expectedOutcome.trim()}</Row>}
          {v.successCriteria.trim() && <Row label="Critérios de sucesso" wide>{v.successCriteria.trim()}</Row>}
        </Section>

        <Section step={2} onEdit={onEdit} errorCount={errorCount(2)}>
          <Row label={`Funcionalidades · ${v.features.length}`} wide>
            {v.features.length === 0 ? (
              <Empty />
            ) : (
              <ul className="mt-1 flex flex-col divide-y divide-line rounded-md shadow-[inset_0_0_0_1px_var(--color-line)]">
                {v.features.map((f, i) => (
                  <li key={f.key} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="font-mono w-5 text-[0.6875rem] text-fg-subtle">{String(i + 1).padStart(2, "0")}</span>
                    <span className="flex-1 truncate text-fg-strong">{f.name.trim() || <span className="text-danger">Sem nome</span>}</span>
                    <span className="flex items-center gap-1.5 text-caption tracking-normal text-fg-muted">
                      <span className={`size-1.5 rounded-full ${PRIORITY_TONE[f.priority]}`} aria-hidden />
                      {FEATURE_PRIORITY_LABELS[f.priority]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Row>
          {v.mandatoryFeatures.trim() && <Row label="Obrigatório" wide>{v.mandatoryFeatures.trim()}</Row>}
          {v.technicalConstraints.trim() && <Row label="Restrições técnicas">{v.technicalConstraints.trim()}</Row>}
          {v.integrations.trim() && <Row label="Integrações">{v.integrations.trim()}</Row>}
        </Section>

        <Section step={3} onEdit={onEdit} errorCount={errorCount(3)}>
          <Row label="Identidade visual">{v.hasVisualIdentity ? ASSET_AVAILABILITY_LABELS[v.hasVisualIdentity] : <Empty />}</Row>
          <Row label="Logo · Manual">
            {v.hasLogo ? ASSET_AVAILABILITY_LABELS[v.hasLogo] : "—"} · {v.hasBrandManual ? ASSET_AVAILABILITY_LABELS[v.hasBrandManual] : "—"}
          </Row>
          <Row label="Sensação">{text(v.desiredFeeling)}</Row>
          <Row label="Evitar">{text(v.stylesToAvoid)}</Row>
          {v.references.length > 0 && (
            <Row label={`Referências · ${v.references.length}`} wide>
              <ul className="flex flex-col gap-1.5">
                {v.references.map((r) => (
                  <li key={r.key} className="flex items-center gap-2">
                    <Link2 className="size-3.5 shrink-0 text-fg-subtle" aria-hidden />
                    <span className="text-fg-strong">{r.name || "Sem nome"}</span>
                    {r.url && <span className="truncate font-mono text-[0.75rem] text-fg-subtle">{r.url}</span>}
                  </li>
                ))}
              </ul>
            </Row>
          )}
        </Section>

        <Section step={4} onEdit={onEdit} errorCount={errorCount(4)}>
          <Row label="Relação">
            {v.engagement ? ENGAGEMENT_LABELS[v.engagement] : <Empty />}
            {v.clientName.trim() && ` · ${v.clientName.trim()}`}
          </Row>
          <Row label="Prazo">
            {[v.desiredDeadline.trim(), v.launchTargetOn && `lançamento em ${formatDate(v.launchTargetOn)}`].filter(Boolean).join(" · ") || <Empty />}
          </Row>
          {v.hasBudget && (
            <Row label="Orçamento">
              <span className="font-numeric">{v.hasBudget === "no" ? "Sem orçamento" : (money(v.budget) ?? "Não informado")}</span>
            </Row>
          )}
          <Row label="Investimento previsto">
            <span className="font-numeric">{money(v.investmentPlanned) ?? "—"}</span>
          </Row>
          <Row label="Receita esperada">
            <span className="font-numeric">{money(v.expectedRevenue) ?? "—"}</span>
          </Row>
          {v.monetizationModel.trim() && <Row label="Monetização" wide>{v.monetizationModel.trim()}</Row>}
        </Section>

        <Section step={5} onEdit={onEdit} errorCount={errorCount(5)}>
          <Row label="Observações" wide>
            {v.observations.trim() ? <span className="line-clamp-[12] text-body">{v.observations.trim()}</span> : <Empty />}
          </Row>
        </Section>
      </div>
    </div>
  );
}
