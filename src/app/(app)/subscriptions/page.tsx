import type { Metadata } from "next";
import { Reveal } from "@/components/motion/reveal";
import { SubscriptionsBoard } from "@/components/subscriptions/subscriptions-board";
import { monthlyCents } from "@/domain/subscriptions";
import { formatMoney } from "@/lib/format";
import { requireUser } from "@/server/auth/session";
import { listProjectIndex } from "@/server/projects/queries";
import { listSubscriptions } from "@/server/subscriptions/queries";

export const metadata: Metadata = { title: "Assinaturas" };

/** Sums monthly equivalents per currency — never converts between currencies. */
function totals(list: { billing: Parameters<typeof monthlyCents>[0]["billing"]; amountCents: number | null; status: "active" | "paused" | "cancelled"; currency: string }[]) {
  const by = new Map<string, number>();
  for (const s of list) {
    if (s.status !== "active") continue;
    const m = monthlyCents(s);
    if (m !== null) by.set(s.currency, (by.get(s.currency) ?? 0) + m);
  }
  return [...by.entries()].map(([currency, cents]) => formatMoney(cents, currency));
}

export default async function SubscriptionsPage() {
  const user = await requireUser();
  const [items, projects] = await Promise.all([listSubscriptions(user.id), listProjectIndex(user.id)]);
  const active = items.filter((s) => s.status === "active");
  const monthly = totals(items);
  const aiBase = active.filter((s) => s.isAiBase);
  const aiMonthly = totals(aiBase);
  const unpriced = active.filter((s) => s.amountCents === null && s.billing !== "on_demand");

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-14 px-4 pt-14 pb-28 sm:px-6 sm:pt-20">
      <Reveal className="flex flex-col gap-3">
        <p className="eyebrow">Assinaturas</p>
        <h1 className="text-display">O que sustenta seus projetos.</h1>
        <p className="max-w-[60ch] text-body text-fg-muted">Ferramentas pagas, planos e créditos — e quanto disso vira custo de cada projeto.</p>
      </Reveal>

      {items.length > 0 && (
        <dl className="grid gap-8 border-y border-line py-7 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <dt className="eyebrow">Recorrente por mês</dt>
            <dd className="font-numeric font-display text-h2 font-medium tracking-[-0.02em] text-fg-strong">{monthly.length ? monthly.join(" + ") : "—"}</dd>
            <dd className="text-caption tracking-normal text-fg-subtle">
              {active.length} {active.length === 1 ? "ativa" : "ativas"}
              {unpriced.length > 0 && ` · ${unpriced.length} sem valor informado`}
            </dd>
          </div>
          <div className="flex flex-col gap-1.5">
            <dt className="eyebrow">Base de IA</dt>
            <dd className="font-numeric font-display text-h2 font-medium tracking-[-0.02em] text-fg-strong">{aiMonthly.length ? aiMonthly.join(" + ") : "—"}</dd>
            <dd className="text-caption tracking-normal text-fg-subtle">{aiBase.length ? aiBase.map((s) => s.service).join(", ") : "Nenhuma assinatura marcada"}</dd>
          </div>
          <div className="flex flex-col gap-1.5">
            <dt className="eyebrow">Sob demanda</dt>
            <dd className="font-display text-h2 font-medium tracking-[-0.02em] text-fg-strong">{active.filter((s) => s.billing === "on_demand").length}</dd>
            <dd className="text-caption tracking-normal text-fg-subtle">Créditos não entram no custo mensal</dd>
          </div>
        </dl>
      )}

      <SubscriptionsBoard
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        items={items.map((s) => ({
          id: s.id,
          service: s.service,
          plan: s.plan,
          billing: s.billing,
          amountCents: s.amountCents,
          currency: s.currency,
          renewsOn: s.renewsOn,
          category: s.category,
          usage: s.usage,
          status: s.status,
          isAiBase: s.isAiBase,
          projects: s.projects,
        }))}
      />
    </div>
  );
}
