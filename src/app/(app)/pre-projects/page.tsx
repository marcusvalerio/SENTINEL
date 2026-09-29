import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ClipboardList, Plus } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PRE_PROJECT_PIPELINE, PRE_PROJECT_STATUS_LABELS, PRE_PROJECT_TONE, type PreProjectStatus } from "@/domain/pre-projects";
import { formatRelative } from "@/lib/format";
import { requireUser } from "@/server/auth/session";
import { listPreProjects } from "@/server/pre-projects/queries";

export const metadata: Metadata = { title: "Pré-projetos" };

const OUTCOMES: PreProjectStatus[] = ["approved", "declined", "archived"];

export default async function PreProjectsPage() {
  const user = await requireUser();
  const items = await listPreProjects(user.id);
  const open = items.filter((i) => PRE_PROJECT_PIPELINE.includes(i.status));
  const closed = items.filter((i) => OUTCOMES.includes(i.status));

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-14 px-4 pt-14 pb-28 sm:px-6 sm:pt-20 lg:px-8">
      <Reveal className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <p className="eyebrow">Descoberta</p>
          <h1 className="text-display">Pré-projetos</h1>
          <p className="max-w-[56ch] text-body text-fg-muted">Demandas antes do compromisso. Descubra, estime, proponha — e só então transforme em projeto.</p>
        </div>
        <ButtonLink href="/pre-projects/new" variant="primary" leading={<Plus className="stroke-[2.25]" />}>
          Novo pré-projeto
        </ButtonLink>
      </Reveal>

      {items.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title="Nenhuma demanda registrada."
          description="Quando alguém pedir um sistema, registre aqui antes de criar o projeto. Nada se perde entre a conversa e a proposta."
          action={
            <ButtonLink href="/pre-projects/new" variant="secondary" size="sm">
              Registrar primeira demanda
            </ButtonLink>
          }
        />
      ) : (
        <>
          <Reveal delay={0.06} className="flex flex-col gap-10">
            {PRE_PROJECT_PIPELINE.map((stage) => {
              const stageItems = open.filter((i) => i.status === stage);
              if (stageItems.length === 0) return null;
              return (
                <section key={stage} className="flex flex-col gap-2" aria-label={PRE_PROJECT_STATUS_LABELS[stage]}>
                  <h2 className="eyebrow flex items-center gap-2">
                    <span className="size-1.5 rounded-full" style={{ background: PRE_PROJECT_TONE[stage] }} aria-hidden />
                    {PRE_PROJECT_STATUS_LABELS[stage]} <span className="font-numeric">{stageItems.length}</span>
                  </h2>
                  <ul className="flex flex-col">
                    {stageItems.map((p) => (
                      <li key={p.id} className="border-t border-line first:border-t-0">
                        <Link href={`/pre-projects/${p.id}`} className="group row-hover -mx-3 grid gap-2 rounded-md px-3 py-4 sm:grid-cols-[minmax(0,1fr)_200px_110px] sm:items-baseline sm:gap-6">
                          <span className="flex min-w-0 flex-col gap-1">
                            <span className="font-display text-h4 font-medium text-fg-strong">{p.title}</span>
                            {p.idea && <span className="line-clamp-1 text-body-sm text-fg-muted">{p.idea}</span>}
                          </span>
                          <span className="truncate text-body-sm text-fg-muted">{[p.requesterName, p.requesterOrg].filter(Boolean).join(" · ") || <span className="text-fg-subtle">Solicitante não informado</span>}</span>
                          <span className="flex items-center justify-between gap-2 text-caption tracking-normal text-fg-subtle sm:justify-end" suppressHydrationWarning>
                            {formatRelative(p.updatedAt)}
                            <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
            {open.length === 0 && <p className="text-body text-fg-muted">Nenhuma demanda em aberto.</p>}
          </Reveal>

          {closed.length > 0 && (
            <Reveal delay={0.12} className="flex flex-col gap-3">
              <h2 className="eyebrow">Encerrados</h2>
              <ul className="flex flex-col">
                {closed.map((p) => (
                  <li key={p.id} className="border-t border-line first:border-t-0">
                    <Link href={`/pre-projects/${p.id}`} className="row-hover -mx-3 flex items-baseline justify-between gap-4 rounded-md px-3 py-3">
                      <span className="truncate text-body-sm text-fg">{p.title}</span>
                      <span className="flex shrink-0 items-center gap-2 text-caption tracking-normal text-fg-subtle">
                        <span className="size-1.5 rounded-full" style={{ background: PRE_PROJECT_TONE[p.status] }} aria-hidden />
                        {PRE_PROJECT_STATUS_LABELS[p.status]}
                        {p.convertedProjectId && " · virou projeto"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </>
      )}
    </div>
  );
}
