import { Landmark } from "lucide-react";
import { DocField, DocSection } from "@/components/project/doc";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ENGAGEMENT_LABELS } from "@/domain/project";
import { formatDate, formatMoney } from "@/lib/format";
import { loadProject } from "@/server/projects/context";

export const metadata = { title: "Finanças" };

function Figure({ label, cents, currency, note }: { label: string; cents: number | null | undefined; currency: string; note?: string }) {
  return (
    <div className="flex flex-col gap-2 px-5 py-5">
      <span className="eyebrow">{label}</span>
      <span className={cents === null || cents === undefined ? "text-h3 text-fg-subtle" : "font-numeric font-display text-h2 font-medium tracking-[-0.02em] text-fg-strong"}>
        {formatMoney(cents, currency)}
      </span>
      {note && <span className="text-caption tracking-normal text-fg-subtle">{note}</span>}
    </div>
  );
}

export default async function FinancePage({ params }: { params: Promise<{ id: string }> }) {
  const { project } = await loadProject(params);
  const f = project.finance;
  const edit = `/projects/${project.id}/edit?step=business`;
  const hasFigures = Boolean(f && [f.budgetCents, f.investmentPlannedCents, f.investmentRealizedCents, f.expectedRevenueCents].some((v) => v !== null));
  const hasContext = Boolean(project.engagement || f?.monetizationModel || project.desiredDeadline || project.launchTargetOn);
  const currency = f?.currency ?? "BRL";
  const usage =
    f?.investmentPlannedCents && f.investmentRealizedCents !== null ? Math.round((f.investmentRealizedCents / f.investmentPlannedCents) * 100) : null;

  if (!hasFigures && !hasContext) {
    return (
      <EmptyState
        icon={<Landmark />}
        title="Nenhuma informação financeira registrada."
        description="Orçamento, investimento e receita esperada ajudam a entender o tamanho da aposta. Tudo é opcional."
        action={
          <ButtonLink href={edit} variant="secondary" size="sm">
            Registrar contexto de negócio
          </ButtonLink>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <DocSection title="Números" description="Valores registrados para o projeto." editHref={edit}>
        <div className="grid divide-line overflow-hidden rounded-lg bg-surface/60 shadow-[inset_0_0_0_1px_var(--color-line)] sm:grid-cols-2 sm:divide-x lg:grid-cols-4 max-sm:divide-y">
          <Figure label="Orçamento" cents={f?.budgetCents} currency={currency} note={f?.hasBudget === false ? "Sem orçamento definido" : undefined} />
          <Figure label="Investimento previsto" cents={f?.investmentPlannedCents} currency={currency} />
          <Figure label="Investimento realizado" cents={f?.investmentRealizedCents} currency={currency} note={usage !== null ? `${usage}% do previsto` : undefined} />
          <Figure label="Receita esperada" cents={f?.expectedRevenueCents} currency={currency} />
        </div>
      </DocSection>
      <DocSection title="Contexto" editHref={edit}>
        <div className="grid gap-6 md:grid-cols-2">
          <DocField label="Relação" value={project.engagement ? [ENGAGEMENT_LABELS[project.engagement], project.clientName].filter(Boolean).join(" · ") : null} />
          <DocField label="Prazo" value={[project.desiredDeadline, project.launchTargetOn && `Lançamento em ${formatDate(project.launchTargetOn, "long")}`].filter(Boolean).join(" · ") || null} />
        </div>
        <DocField label="Modelo de monetização" value={f?.monetizationModel} />
      </DocSection>
    </div>
  );
}
