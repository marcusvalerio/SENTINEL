import Link from "next/link";
import { ArrowUpRight, Plug } from "lucide-react";
import { GithubMark } from "@/components/brand/github-mark";
import { formatRelative } from "@/lib/format";
import type { ProjectGithubConnection } from "@/server/db/schema";

/**
 * Development activity — deliberately separate from progress. GitHub tells us
 * something is happening, not how close the project is to done.
 */
export function ActivityPanel({ projectId, github }: { projectId: string; github: ProjectGithubConnection | null }) {
  return (
    <div className="flex h-full flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <span className="eyebrow">Atividade de desenvolvimento</span>
        <span className="text-caption tracking-normal text-fg-subtle">Fonte: GitHub · não representa progresso</span>
      </div>
      {github ? (
        <div className="flex flex-1 flex-col justify-between gap-4">
          <a
            href={github.githubRepositoryUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="group flex items-center gap-3 rounded-md bg-sunken/60 px-3 py-3 shadow-[inset_0_0_0_1px_var(--color-line)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--color-line-3)]"
          >
            <GithubMark className="size-5 text-fg-strong" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-mono text-[0.8125rem] text-fg-strong">
                <span className="text-fg-muted">{github.githubOwner}/</span>
                {github.githubRepositoryName}
              </span>
              <span className="text-caption tracking-normal text-fg-subtle">{github.githubDefaultBranch ? `branch ${github.githubDefaultBranch}` : "branch padrão desconhecida"}</span>
            </span>
            <ArrowUpRight className="ml-auto size-4 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
          </a>
          <p className="flex items-center gap-2 text-body-sm text-fg-muted">
            <span className="relative flex size-2" aria-hidden>
              <span className="absolute inset-0 rounded-full bg-info/40" />
              <span className="relative m-auto size-1 rounded-full bg-info" />
            </span>
            {github.githubLastSyncedAt ? <span suppressHydrationWarning>Sincronizado {formatRelative(github.githubLastSyncedAt)}</span> : "Conectado · aguardando a primeira sincronização"}
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-start justify-between gap-4">
          <p className="text-body-sm text-fg-muted">Nenhum repositório conectado. Commits, branches e releases aparecerão aqui.</p>
          <Link
            href={`/projects/${projectId}/github`}
            className="inline-flex h-8 items-center gap-2 rounded-sm px-2.5 text-body-sm text-fg shadow-[inset_0_0_0_1px_var(--color-line-2)] transition-colors hover:bg-surface-2 hover:text-fg-strong"
          >
            <Plug className="size-3.5" aria-hidden />
            Conectar GitHub
          </Link>
        </div>
      )}
    </div>
  );
}
