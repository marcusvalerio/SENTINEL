import Link from "next/link";
import { Landmark, Sparkles } from "lucide-react";
import { DocField, DocSection } from "@/components/project/doc";
import { FinanceEditor } from "@/components/project/finance-editor";
import { financeSummary } from "@/domain/finance";
import {
  BILLING_LABELS,
  aiBaseCost,
  monthlyCents,
} from "@/domain/subscriptions";
import { subscriptionsForProject } from "@/server/subscriptions/queries";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ENGAGEMENT_LABELS } from "@/domain/project";
import { formatDate, formatMoney } from "@/lib/format";
import { loadProject } from "@/server/projects/context";

export const metadata = { title: "Finanças" };

function Figure({
  label,
  cents,
  currency,
  note,
}: {
  label: string;
  cents: number | null | undefined;
  currency: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-2 px-5 py-5">
      <span className="eyebrow">{label}</span>
      <span
        className={
          cents === null || cents === undefined
            ? "text-h3 text-fg-subtle"
            : "font-numeric font-display text-h2 font-medium tracking-[-0.02em] text-fg-strong"
        }
      >
        {formatMoney(cents, currency)}
      </span>
      {note && (
        <span className="text-caption tracking-normal text-fg-subtle">
          {note}
        </span>
      )}
    </div>
  );
}

export default async function FinancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, project } = await loadProject(params);
  const f = project.finance;
  const subs = await subscriptionsForProject(user.id, project.id);
  const edit = `/projects/${project.id}/edit?step=business`;
  const hasFigures = Boolean(
    f &&
    [
      f.budgetCents,
      f.investmentPlannedCents,
      f.investmentRealizedCents,
      f.expectedRevenueCents,
    ].some((v) => v !== null),
  );
  const hasContext = Boolean(
    project.engagement ||
    f?.monetizationModel ||
    project.desiredDeadline ||
    project.launchTargetOn,
  );
  const currency = f?.currency ?? "BRL";
  const usage =
    f?.investmentPlannedCents && f.investmentRealizedCents !== null
      ? Math.round((f.investmentRealizedCents / f.investmentPlannedCents) * 100)
      : null;

  // AI base: only subscriptions in the project's currency, only prices the user entered.
  const aiSameCurrency = subs.aiBase.filter((s) => s.currency === currency);
  const aiOtherCurrency = subs.aiBase
    .filter((s) => s.currency !== currency && s.status !== "cancelled")
    .map((s) => s.service);
  const ai = f?.aiBaseMonths
    ? aiBaseCost(aiSameCurrency, f.aiBaseMonths)
    : null;
  const summary = financeSummary({
    estimatedCostCents: f?.estimatedCostCents ?? null,
    actualCostCents: f?.actualCostCents ?? null,
    revenueCents: f?.revenueCents ?? null,
    contractedValueCents: f?.contractedValueCents ?? null,
    investmentRealizedCents: f?.investmentRealizedCents ?? null,
    aiBaseCents: ai ? ai.totalCents : null,
  });
  const hasEconomics = Boolean(
    f &&
    [
      f.estimatedCostCents,
      f.actualCostCents,
      f.revenueCents,
      f.contractedValueCents,
      f.aiBaseMonths,
    ].some((v) => v !== null),
  );
  const editor = (
    <FinanceEditor
      projectId={project.id}
      aiBaseServices={subs.aiBase
        .filter((s) => s.status !== "cancelled")
        .map((s) => s.service)}
      values={{
        estimatedCost: f?.estimatedCostCents ?? null,
        actualCost: f?.actualCostCents ?? null,
        revenue: f?.revenueCents ?? null,
        contractedValue: f?.contractedValueCents ?? null,
        aiBaseMonths: f?.aiBaseMonths ?? null,
      }}
    />
  );

  if (!hasFigures && !hasContext && !hasEconomics && subs.linked.length === 0) {
    return (
      <EmptyState
        icon={<Landmark />}
        title="Nenhuma informação financeira registrada."
        description="Custo, receita e contrato ajudam a entender o tamanho da aposta. Tudo é opcional — e nenhum valor é preenchido por conta própria."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {editor}
            <ButtonLink href={edit} variant="ghost" size="sm">
              Contexto de negócio
            </ButtonLink>
          </div>
        }
      />
    );
  }

  const pct = (v: number | null, suffix = "%") =>
    v === null ? "—" : `${v}${suffix}`;

  return (
    <div className="flex flex-col gap-14">
      <section className="flex flex-col gap-6" aria-labelledby="economics">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 id="economics" className="text-h3">
              Economia do projeto
            </h2>
            <p className="max-w-[62ch] text-body-sm text-fg-muted">
              Custo, receita e o que sobra. Cada indicador só aparece quando os
              números por trás dele existem.
            </p>
          </div>
          {editor}
        </div>
        <dl className="grid gap-x-10 gap-y-8 border-y border-line py-7 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <dt className="eyebrow">Custo</dt>
            <dd className="font-numeric font-display text-h2 font-medium tracking-[-0.02em] text-fg-strong">
              {formatMoney(summary.cost, currency)}
            </dd>
            <dd className="text-caption tracking-normal text-fg-subtle">
              {f?.estimatedCostCents
                ? `Estimado ${formatMoney(f.estimatedCostCents, currency)}${summary.budgetUse !== null ? ` · ${summary.budgetUse}% usado` : ""}`
                : "Sem custo estimado"}
            </dd>
          </div>
          <div className="flex flex-col gap-1.5">
            <dt className="eyebrow">
              {summary.incomeSource === "contract" ? "Contrato" : "Receita"}
            </dt>
            <dd className="font-numeric font-display text-h2 font-medium tracking-[-0.02em] text-fg-strong">
              {formatMoney(summary.income, currency)}
            </dd>
            <dd className="text-caption tracking-normal text-fg-subtle">
              {summary.incomeSource === "contract"
                ? "Valor contratado — ainda sem receita registrada"
                : summary.incomeSource
                  ? "Receita registrada"
                  : "Não informado"}
            </dd>
          </div>
          <div className="flex flex-col gap-1.5">
            <dt className="eyebrow">Margem</dt>
            <dd
              className={
                summary.margin !== null && summary.margin < 0
                  ? "font-numeric font-display text-h2 font-medium tracking-[-0.02em] text-danger"
                  : "font-numeric font-display text-h2 font-medium tracking-[-0.02em] text-fg-strong"
              }
            >
              {formatMoney(summary.margin, currency)}
            </dd>
            <dd className="text-caption tracking-normal text-fg-subtle">
              {summary.marginPct !== null
                ? `${summary.marginPct}% da ${summary.incomeSource === "contract" ? "receita contratada" : "receita"}`
                : "Precisa de custo e receita"}
            </dd>
          </div>
          <div className="flex flex-col gap-1.5">
            <dt className="eyebrow">ROI</dt>
            <dd className="font-numeric font-display text-h2 font-medium tracking-[-0.02em] text-fg-strong">
              {pct(summary.roiPct)}
            </dd>
            <dd className="text-caption tracking-normal text-fg-subtle">
              Margem sobre o custo
            </dd>
          </div>
        </dl>
        {f?.aiBaseMonths ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-fg-muted">
            <Sparkles className="size-3.5 text-accent" aria-hidden />
            {ai && ai.services.length > 0
              ? `Custo inclui ${f.aiBaseMonths} ${f.aiBaseMonths === 1 ? "mês" : "meses"} da base de IA (${ai.services.join(" + ")}): ${formatMoney(ai.totalCents, currency)}.`
              : `Base de IA aplicada (${f.aiBaseMonths} ${f.aiBaseMonths === 1 ? "mês" : "meses"}), mas nenhuma assinatura da base tem valor informado.`}
            {ai && ai.missingPrice.length > 0 && (
              <span className="text-warning">
                Sem valor: {ai.missingPrice.join(", ")}.
              </span>
            )}
            {aiOtherCurrency.length > 0 && (
              <span className="text-fg-subtle">
                Em outra moeda, não somado: {aiOtherCurrency.join(", ")}.
              </span>
            )}
            <Link
              href="/subscriptions"
              className="text-fg transition-colors hover:text-accent"
            >
              Assinaturas
            </Link>
          </p>
        ) : null}
      </section>

      {subs.linked.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="linked-subs">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="linked-subs" className="eyebrow">
              Assinaturas usadas no projeto
            </h2>
            <Link
              href="/subscriptions"
              className="text-caption tracking-normal text-fg-muted transition-colors hover:text-accent"
            >
              Gerenciar
            </Link>
          </div>
          <ul className="flex flex-col divide-y divide-line border-y border-line">
            {subs.linked.map((s) => {
              const m = monthlyCents(s);
              return (
                <li
                  key={s.id}
                  className="flex items-baseline justify-between gap-4 py-3"
                >
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="text-body-sm font-medium text-fg-strong">
                      {s.service}
                    </span>
                    <span className="truncate text-caption tracking-normal text-fg-subtle">
                      {[s.plan, BILLING_LABELS[s.billing]]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="font-numeric shrink-0 text-body-sm text-fg">
                    {m !== null
                      ? `${formatMoney(m, s.currency)}/mês`
                      : s.billing === "on_demand"
                        ? "Por uso"
                        : formatMoney(s.amountCents, s.currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(hasFigures || hasContext) && (
        <>
          <DocSection
            title="Planejamento"
            description="Orçamento e investimento registrados na criação do projeto."
            editHref={edit}
          >
            <div className="grid divide-line border-y border-line sm:grid-cols-2 sm:divide-x lg:grid-cols-4 max-sm:divide-y">
              <Figure
                label="Orçamento"
                cents={f?.budgetCents}
                currency={currency}
                note={
                  f?.hasBudget === false ? "Sem orçamento definido" : undefined
                }
              />
              <Figure
                label="Investimento previsto"
                cents={f?.investmentPlannedCents}
                currency={currency}
              />
              <Figure
                label="Investimento realizado"
                cents={f?.investmentRealizedCents}
                currency={currency}
                note={usage !== null ? `${usage}% do previsto` : undefined}
              />
              <Figure
                label="Receita esperada"
                cents={f?.expectedRevenueCents}
                currency={currency}
              />
            </div>
          </DocSection>
          <DocSection title="Contexto" editHref={edit}>
            <div className="grid gap-6 md:grid-cols-2">
              <DocField
                label="Relação"
                value={
                  project.engagement
                    ? [
                        ENGAGEMENT_LABELS[project.engagement],
                        project.clientName,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : null
                }
              />
              <DocField
                label="Prazo"
                value={
                  [
                    project.desiredDeadline,
                    project.launchTargetOn &&
                      `Lançamento em ${formatDate(project.launchTargetOn, "long")}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || null
                }
              />
            </div>
            <DocField
              label="Modelo de monetização"
              value={f?.monetizationModel}
            />
          </DocSection>
        </>
      )}
    </div>
  );
}
