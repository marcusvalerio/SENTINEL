import type { Metadata } from "next";
import { FolderPlus, Plus, SearchX } from "lucide-react";
import { DraftList } from "@/components/projects/draft-list";
import { ProjectList } from "@/components/projects/project-list";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TabNav } from "@/components/ui/tabs";
import { PROJECT_COLLECTIONS, PROJECT_COLLECTION_LABELS, type ProjectCollection } from "@/domain/project";
import { requireUser } from "@/server/auth/session";
import { countProjectsByStatus, listDrafts, listProjects } from "@/server/projects/queries";

export const metadata: Metadata = { title: "Projetos" };

const EMPTY_COLLECTION: Record<Exclude<ProjectCollection, "all">, string> = {
  active: "Nenhum projeto ativo no momento.",
  paused: "Nenhum projeto em pausa.",
  completed: "Nenhum projeto concluído ainda.",
  archived: "Nada arquivado por aqui.",
};

function todayLabel() {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date());
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await requireUser();
  const { view } = await searchParams;
  const collection: ProjectCollection = PROJECT_COLLECTIONS.includes(view as ProjectCollection) ? (view as ProjectCollection) : "all";

  const [projects, counts, drafts] = await Promise.all([listProjects(user.id, collection), countProjectsByStatus(user.id), listDrafts(user.id)]);
  const firstRun = counts.all === 0;

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-4 pt-10 pb-24 sm:px-6 sm:pt-14 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <p className="eyebrow first-letter:uppercase">{todayLabel()}</p>
          <h1 className="flex items-baseline gap-3 text-h1 sm:text-display">
            Projetos
            {!firstRun && <span className="font-numeric text-h3 font-normal tracking-normal text-fg-subtle">{counts.all}</span>}
          </h1>
          <p className="max-w-xl text-body text-fg-muted">
            O que existe, por que existe, como nasceu e para onde está indo.
          </p>
        </div>
        <ButtonLink href="/projects/new" variant="primary" leading={<Plus className="stroke-[2.25]" />} className="sm:hidden">
          Novo projeto
        </ButtonLink>
      </header>

      <DraftList drafts={drafts.map((d) => ({ ...d, updatedAt: d.updatedAt.toISOString() }))} />

      {firstRun ? (
        <EmptyState
          icon={<FolderPlus />}
          title="Nenhum projeto registrado ainda"
          description="Registre o nascimento do primeiro projeto: o problema, o objetivo, o escopo e tudo o que não pode se perder."
          action={
            <ButtonLink href="/projects/new" variant="primary" leading={<Plus className="stroke-[2.25]" />}>
              Registrar primeiro projeto
            </ButtonLink>
          }
        />
      ) : (
        <section aria-label="Lista de projetos" className="flex flex-col gap-4">
          <TabNav
            id="collections"
            label="Filtrar projetos"
            variant="segmented"
            items={PROJECT_COLLECTIONS.map((c) => ({
              href: c === "all" ? "/" : `/?view=${c}`,
              label: PROJECT_COLLECTION_LABELS[c],
              count: counts[c],
              active: c === collection,
            }))}
          />
          {projects.length > 0 ? (
            <ProjectList
              projects={projects.map((p) => ({
                ...p,
                lastActivityAt: p.lastActivityAt.toISOString(),
                createdAt: p.createdAt.toISOString(),
                github: p.github?.owner && p.github.name ? { owner: p.github.owner, name: p.github.name } : null,
              }))}
            />
          ) : (
            <EmptyState compact icon={<SearchX />} title={EMPTY_COLLECTION[collection as Exclude<ProjectCollection, "all">] ?? "Nada por aqui."} description="Os projetos aparecem aqui conforme o status muda." />
          )}
        </section>
      )}
    </div>
  );
}
