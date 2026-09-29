import Link from "next/link";
import { ArrowRight, NotebookPen, Wrench } from "lucide-react";
import { NoteTypeTag } from "@/components/project/note-meta";
import { DetailList } from "@/components/project/doc";
import { HistoryList } from "@/components/project/history-list";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/surface";
import { AttentionList } from "@/components/command-center/sections";
import { CopyContextButton } from "@/components/project/copy-context";
import { AsideBlock, HealthSignals, RepositoryLine, StackList } from "@/components/project/dna";
import { FocusEditor } from "@/components/project/focus-editor";
import { isQuietWeek, projectContextMarkdown, weeklyBrief } from "@/domain/project-brief";
import {
  ENGAGEMENT_LABELS,
  FEATURE_STATUSES,
  FEATURE_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
} from "@/domain/project";
import { stripMarkdown } from "@/domain/markdown";
import { formatDate, formatRelative } from "@/lib/format";
import { loadProject } from "@/server/projects/context";
import { projectHealth } from "@/server/intelligence/health";
import { buildProjectContext, weekCounts } from "@/server/projects/brief";
import { getHistory, getMilestones } from "@/server/projects/intelligence";
import { getFeatures, getMembers, getNotes, getTools } from "@/server/projects/queries";

const FEATURE_BAR: Record<string, string> = { done: "bg-accent", in_progress: "bg-[#93a6d8]", planned: "bg-surface-3" };
const SOURCE_LABELS = { manual: "Criado manualmente", github_import: "Importado do GitHub", pre_project: "Pré-projeto" } as const;
const FEATURE_DOT: Record<string, string> = { done: "bg-accent", in_progress: "bg-[#93a6d8]", planned: "bg-fg-subtle" };

export default async function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, project } = await loadProject(params);
  const [notes, events, features, tools, members, milestones, health, week] = await Promise.all([
    getNotes(project.id, 3),
    getHistory(project.id).then((items) => items.slice(0, 6)),
    getFeatures(project.id),
    getTools(project.id),
    getMembers(project.id),
    getMilestones(project.id),
    projectHealth(user.id, project.id),
    weekCounts(project.id),
  ]);
  const attention = health?.attention ?? [];
  const context = projectContextMarkdown(await buildProjectContext(project, attention.map((a) => `${a.title} — ${a.reason}`)));
  const brief = weeklyBrief(week);
  const nextMilestone = milestones.find((m) => m.status === "active") ?? milestones.find((m) => m.status === "planned");
  const base = `/projects/${project.id}`;
  const byStatus = FEATURE_STATUSES.map((s) => ({ status: s, count: features.filter((f) => f.status === s).length }));

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
      <div className="flex min-w-0 flex-col gap-12">
        <FocusEditor key={project.currentFocus ?? ""} projectId={project.id} focus={project.currentFocus} />

        {/* What needs attention — explainable, from stored data only */}
        <section className="flex flex-col gap-3" aria-labelledby="attention">
          <h2 id="attention" className="eyebrow">
            O que precisa da sua atenção
          </h2>
          <AttentionList items={attention} showProject={false} empty={<p className="text-body-sm text-fg-muted">Nada pedindo atenção agora. Os sinais ao lado explicam por quê.</p>} />
        </section>

        {/* Last 7 days — deterministic sentences */}
        <section className="flex flex-col gap-3" aria-labelledby="week">
          <h2 id="week" className="eyebrow">
            Últimos 7 dias
          </h2>
          {isQuietWeek(week) ? (
            <p className="text-body text-fg-muted">Semana silenciosa: nenhum registro, commit ou entrega nos últimos 7 dias.</p>
          ) : brief.length === 0 ? (
            <p className="text-body text-fg-muted">
              {week.events} {week.events === 1 ? "evento registrado" : "eventos registrados"} na linha do tempo.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {brief.map((line) => (
                <li key={line} className="flex items-baseline gap-3 text-body text-fg">
                  <span className="size-1 shrink-0 translate-y-[-2px] rounded-full bg-accent/70" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Purpose */}
        <section className="flex flex-col gap-6" aria-labelledby="purpose">
          <h2 id="purpose" className="eyebrow">
            Propósito
          </h2>
          <blockquote className="relative border-l-2 border-accent/60 pl-5 sm:pl-6">
            <p className="font-display text-h3 leading-snug font-normal tracking-[-0.012em] whitespace-pre-line text-fg-strong sm:text-[1.375rem]">{project.primaryGoal}</p>
            <footer className="mt-3 text-caption tracking-normal text-fg-subtle">Objetivo principal</footer>
          </blockquote>
          {(project.problem || project.audience) && (
            <div className="grid gap-6 sm:grid-cols-2">
              {project.problem && (
                <div className="flex flex-col gap-1.5">
                  <h3 className="eyebrow">Problema</h3>
                  <p className="max-w-[72ch] font-reading text-reading whitespace-pre-line text-fg">{project.problem}</p>
                </div>
              )}
              {project.audience && (
                <div className="flex flex-col gap-1.5">
                  <h3 className="eyebrow">Público</h3>
                  <p className="max-w-[72ch] font-reading text-reading whitespace-pre-line text-fg">{project.audience}</p>
                </div>
              )}
            </div>
          )}
          <Link href={`${base}/objetivos`} className="group inline-flex w-fit items-center gap-1.5 text-body-sm text-fg-muted transition-colors hover:text-accent">
            Contexto completo
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </section>

        {/* Rubrica */}
        <section className="flex flex-col gap-4" aria-labelledby="recent-notes">
          <SectionHeader
            title="Rubrica"
            description="Os registros mais recentes do diário do projeto."
            action={
              notes.length > 0 && (
                <ButtonLink href={`${base}/rubrica`} variant="ghost" size="sm" trailing={<ArrowRight />}>
                  Abrir Rubrica
                </ButtonLink>
              )
            }
          />
          {notes.length === 0 ? (
            <EmptyState
              compact
              icon={<NotebookPen />}
              title="Este projeto ainda não possui registros."
              description="Ideias, decisões, dúvidas e reuniões formam a memória do projeto."
              action={
                <ButtonLink href={`${base}/rubrica?new=1`} variant="secondary" size="sm">
                  Nova anotação
                </ButtonLink>
              }
            />
          ) : (
            <ul className="flex flex-col divide-y divide-line border-y border-line">
              {notes.map((note) => (
                <li key={note.id}>
                  <Link href={`${base}/rubrica#note-${note.id}`} className="row-hover -mx-3 flex flex-col gap-2 rounded-md px-3 py-4 sm:flex-row sm:items-start sm:gap-4">
                    <span className="font-numeric w-24 shrink-0 pt-0.5 text-caption tracking-normal text-fg-subtle">{formatDate(note.createdAt, "numeric")}</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-body-sm font-medium text-fg-strong">{note.title}</span>
                      {note.content && <span className="line-clamp-2 text-body-sm text-fg-muted">{stripMarkdown(note.content)}</span>}
                    </span>
                    <NoteTypeTag type={note.type} className="self-start" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Timeline */}
        <section className="flex flex-col gap-5" aria-labelledby="recent-timeline">
          <SectionHeader
            title="Linha do tempo"
            description="Como o projeto chegou até aqui."
            action={
              <ButtonLink href={`${base}/timeline`} variant="ghost" size="sm" trailing={<ArrowRight />}>
                Ver completa
              </ButtonLink>
            }
          />
          <HistoryList items={events} compact />
        </section>
      </div>

      {/* Aside — Project DNA. Open blocks separated by hairlines. */}
      <aside className="flex flex-col gap-7 lg:border-l lg:border-line lg:pl-10">
        <AsideBlock title="Saúde" action={<CopyContextButton markdown={context} />}>
          {health ? <HealthSignals signals={health.signals} /> : null}
        </AsideBlock>

        <AsideBlock title="DNA do projeto">
          <DetailList
            items={[
              { label: "Status", value: PROJECT_STATUS_LABELS[project.status] },
              { label: "Tipo", value: PROJECT_TYPE_LABELS[project.type] },
              { label: "Categoria", value: project.category },
              { label: "Responsável", value: project.leadName },
              { label: "Início", value: project.startedOn ? formatDate(project.startedOn) : null },
              { label: "Lançamento", value: project.launchTargetOn ? formatDate(project.launchTargetOn) : project.desiredDeadline },
              { label: "Relação", value: project.engagement ? [ENGAGEMENT_LABELS[project.engagement], project.clientName].filter(Boolean).join(" · ") : null },
              { label: "Origem", value: SOURCE_LABELS[project.source] },
              { label: "Atualizado", value: <span suppressHydrationWarning>{formatRelative(project.updatedAt)}</span> },
            ]}
          />
        </AsideBlock>

        <AsideBlock
          title="Próximo milestone"
          action={
            <Link href={`${base}/roadmap`} className="text-caption tracking-normal text-fg-muted transition-colors hover:text-accent">
              Roadmap
            </Link>
          }
        >
          {nextMilestone ? (
            <Link href={`${base}/roadmap#milestone-${nextMilestone.id}`} className="group flex flex-col gap-0.5">
              <span className="text-body-sm font-medium text-fg-strong transition-colors group-hover:text-accent">{nextMilestone.name}</span>
              <span className="text-caption tracking-normal text-fg-subtle">{nextMilestone.dueOn ? `Previsto para ${formatDate(nextMilestone.dueOn)}` : "Sem data prevista"}</span>
            </Link>
          ) : (
            <p className="text-body-sm text-fg-subtle">Nenhum milestone em aberto.</p>
          )}
        </AsideBlock>

        <AsideBlock
          title="Stack"
          action={
            <Link href={`${base}/tecnologia`} className="text-caption tracking-normal text-fg-muted transition-colors hover:text-accent">
              Tecnologia
            </Link>
          }
        >
          {project.github && <RepositoryLine owner={project.github.githubOwner} name={project.github.githubRepositoryName} href={`${base}/github`} />}
          <StackList stack={project.stack ?? []} />
        </AsideBlock>

        <AsideBlock
          title="Escopo"
          action={
            <Link href={`${base}/escopo`} className="text-caption tracking-normal text-fg-muted transition-colors hover:text-accent">
              {features.length} {features.length === 1 ? "funcionalidade" : "funcionalidades"}
            </Link>
          }
        >
          {features.length === 0 ? (
            <p className="text-body-sm text-fg-subtle">Nenhuma funcionalidade registrada.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex h-1 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                {byStatus.map(({ status, count }) =>
                  count > 0 ? <span key={status} className={FEATURE_BAR[status]} style={{ width: `${(count / features.length) * 100}%` }} /> : null,
                )}
              </div>
              <ul className="flex flex-col gap-1.5">
                {byStatus.map(({ status, count }) => (
                  <li key={status} className="flex items-center justify-between text-body-sm">
                    <span className="flex items-center gap-2 text-fg-muted">
                      <span className={`size-1.5 rounded-full ${FEATURE_DOT[status]}`} aria-hidden />
                      {FEATURE_STATUS_LABELS[status]}
                    </span>
                    <span className="font-numeric text-fg">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </AsideBlock>

        <AsideBlock
          title="Ferramentas"
          action={
            <Link href={`${base}/ferramentas`} className="text-caption tracking-normal text-fg-muted transition-colors hover:text-accent">
              Gerenciar
            </Link>
          }
        >
          {tools.length === 0 ? (
            <Link href={`${base}/ferramentas`} className="flex items-center gap-2 text-body-sm text-fg-subtle transition-colors hover:text-fg">
              <Wrench className="size-3.5" aria-hidden />
              Registrar ferramentas utilizadas
            </Link>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {tools.map((tool) => (
                <li key={tool.id}>
                  <Badge>{tool.name}</Badge>
                </li>
              ))}
            </ul>
          )}
        </AsideBlock>

        {members.length > 0 && (
          <AsideBlock title="Pessoas">
            <ul className="flex flex-col gap-3">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-identity font-display text-[11px] font-semibold text-accent shadow-[inset_0_0_0_1px_rgb(215_196_133/0.2)]" aria-hidden>
                    {m.name
                      .split(/\s+/)
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-body-sm text-fg-strong">{m.name}</span>
                    <span className="truncate text-caption tracking-normal text-fg-subtle">{m.role ?? "Participante"}</span>
                  </span>
                </li>
              ))}
            </ul>
          </AsideBlock>
        )}
      </aside>
    </div>
  );
}
