import type { Metadata } from "next";
import Link from "next/link";
import { AnimatedNumber } from "@/components/motion/number";
import { Reveal } from "@/components/motion/reveal";
import { StatusDot } from "@/components/ui/status";
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS } from "@/domain/project";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/server/auth/session";
import { loadCreationHistory } from "@/server/intelligence/creation-history";

export const metadata: Metadata = { title: "Histórico" };

const SOURCE_LABELS = { manual: "Criados do zero", github_import: "Importados do GitHub", pre_project: "Vindos de pré-projetos" } as const;

export default async function HistoryPage() {
  const user = await requireUser();
  const h = await loadCreationHistory(user.id);
  const peak = Math.max(1, ...h.months.map((m) => m.projects + m.features + m.notes));

  const facts = [
    h.medianDaysToComplete !== null ? { label: "Da criação à conclusão", value: `${h.medianDaysToComplete} dias`, note: `Mediana de ${h.totals.completed} ${h.totals.completed === 1 ? "projeto concluído" : "projetos concluídos"}` } : null,
    h.preProjectConversion !== null ? { label: "Pré-projetos convertidos", value: `${h.preProjectConversion}%`, note: "Demandas que viraram projeto" } : null,
    h.ideaConversion !== null ? { label: "Ideias convertidas", value: `${h.ideaConversion}%`, note: "Do Inbox para algo real" } : null,
  ].filter((f): f is { label: string; value: string; note: string } => f !== null);

  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-16 px-4 pt-14 pb-28 sm:px-6 sm:pt-20">
      <Reveal className="flex flex-col gap-3">
        <p className="eyebrow">Histórico de criação</p>
        <h1 className="text-display">Tudo o que você já construiu.</h1>
        <p className="max-w-[60ch] text-body text-fg-muted">
          {h.since ? `Desde ${formatDate(h.since, "long")}. ` : ""}Cada número aqui é contado a partir do que está registrado — nada é estimado.
        </p>
      </Reveal>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-8 border-y border-line py-8 sm:grid-cols-5">
        {[
          { label: "Projetos", value: h.totals.projects },
          { label: "Concluídos", value: h.totals.completed },
          { label: "Entregas", value: h.totals.featuresDone },
          { label: "Registros", value: h.totals.notes },
          { label: "Decisões", value: h.totals.decisions },
        ].map((s) => (
          <div key={s.label} className="flex flex-col gap-1">
            <dt className="eyebrow">{s.label}</dt>
            <dd className="font-numeric font-display text-h1 font-medium tracking-[-0.03em] text-fg-strong">
              <AnimatedNumber value={s.value} />
            </dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-5" aria-labelledby="rhythm">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="rhythm" className="eyebrow">
            Ritmo — últimos 12 meses
          </h2>
          <p className="flex items-center gap-4 text-caption tracking-normal text-fg-subtle">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-xs bg-accent" aria-hidden />
              Projetos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-xs bg-[#93a6d8]" aria-hidden />
              Entregas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-xs bg-fg-subtle" aria-hidden />
              Registros
            </span>
          </p>
        </div>
        <ol className="grid h-40 grid-cols-12 items-end gap-1.5 sm:gap-3">
          {h.months.map((m) => {
            const total = m.projects + m.features + m.notes;
            return (
              <li key={m.key} className="flex h-full flex-col items-center justify-end gap-2" title={`${m.label}: ${m.projects} projetos, ${m.features} entregas, ${m.notes} registros`}>
                <div className="flex w-full max-w-9 flex-col-reverse overflow-hidden rounded-xs" style={{ height: `${Math.max(total ? 6 : 2, (total / peak) * 100)}%` }}>
                  {total === 0 ? (
                    <span className="h-full bg-surface-3" />
                  ) : (
                    <>
                      <span className="bg-accent" style={{ flexGrow: m.projects }} />
                      <span className="bg-[#93a6d8]" style={{ flexGrow: m.features }} />
                      <span className="bg-fg-subtle/60" style={{ flexGrow: m.notes }} />
                    </>
                  )}
                </div>
                <span className="text-[0.6875rem] text-fg-subtle capitalize">{m.label}</span>
                <span className="sr-only">
                  {m.projects} projetos, {m.features} entregas, {m.notes} registros
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {(facts.length > 0 || h.topTypes.length > 0) && (
        <section className="grid gap-10 md:grid-cols-2" aria-label="Padrões">
          {facts.length > 0 && (
            <dl className="flex flex-col gap-6">
              {facts.map((f) => (
                <div key={f.label} className="flex flex-col gap-1 border-t border-line pt-4">
                  <dt className="eyebrow">{f.label}</dt>
                  <dd className="font-numeric font-display text-h2 font-medium tracking-[-0.02em] text-fg-strong">{f.value}</dd>
                  <dd className="text-caption tracking-normal text-fg-subtle">{f.note}</dd>
                </div>
              ))}
            </dl>
          )}
          {h.totals.projects > 0 && (
            <div className={facts.length ? "flex flex-col gap-6" : "grid gap-6 md:col-span-2 md:grid-cols-2 md:gap-10"}>
              <div className="flex flex-col gap-3 border-t border-line pt-4">
                <h3 className="eyebrow">O que você mais cria</h3>
                <ul className="flex flex-col gap-2">
                  {h.topTypes.map(([type, n]) => (
                    <li key={type} className="flex items-center gap-3 text-body-sm">
                      <span className="w-32 shrink-0 truncate text-fg sm:w-40">{PROJECT_TYPE_LABELS[type]}</span>
                      <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
                        <span className="block h-full rounded-full bg-accent/80" style={{ width: `${(n / h.totals.projects) * 100}%` }} />
                      </span>
                      <span className="font-numeric w-6 text-right text-fg-muted">{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-3 border-t border-line pt-4">
                <h3 className="eyebrow">Como os projetos começaram</h3>
                <ul className="flex flex-col gap-1.5">
                  {(Object.keys(SOURCE_LABELS) as (keyof typeof SOURCE_LABELS)[]).map((k) => (
                    <li key={k} className="flex items-baseline justify-between text-body-sm">
                      <span className="text-fg-muted">{SOURCE_LABELS[k]}</span>
                      <span className="font-numeric text-fg">{h.bySource[k]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      )}

      {h.byYear.length > 0 ? (
        <section className="flex flex-col gap-10" aria-labelledby="by-year">
          <h2 id="by-year" className="sr-only">
            Projetos por ano
          </h2>
          {h.byYear.map(([year, list]) => (
            <div key={year} className="grid gap-4 md:grid-cols-[140px_minmax(0,1fr)]">
              <p className="font-numeric font-display text-h2 font-medium tracking-[-0.02em] text-fg-subtle">{year}</p>
              <ul className="flex flex-col border-y border-line">
                {list.map((p) => (
                  <li key={p.id} className="border-t border-line first:border-t-0">
                    <Link href={`/projects/${p.id}`} className="row-hover -mx-3 flex items-center gap-4 rounded-md px-3 py-3">
                      <span className="font-numeric w-11 shrink-0 text-caption tracking-normal text-fg-subtle sm:w-20">{formatDate(p.createdAt, "numeric").slice(0, 5)}</span>
                      <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-fg-strong">{p.name}</span>
                      <span className="hidden text-caption tracking-normal text-fg-subtle sm:inline">{PROJECT_TYPE_LABELS[p.type]}</span>
                      <span className="flex shrink-0 items-center justify-end gap-2 text-caption tracking-normal text-fg-muted sm:w-36">
                        <StatusDot status={p.status} />
                        {PROJECT_STATUS_LABELS[p.status]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : (
        <p className="text-body text-fg-muted">
          Nenhum projeto ainda. <Link href="/projects/start" className="text-fg-strong underline decoration-line-strong underline-offset-4 hover:text-accent">Comece o primeiro</Link>.
        </p>
      )}
    </div>
  );
}
