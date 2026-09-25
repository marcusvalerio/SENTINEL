import Link from "next/link";
import { Plug } from "lucide-react";
import { GithubMark } from "@/components/brand/github-mark";
import { SyncStatusLine } from "@/components/github/sync-status";
import type { ProjectGithubConnection } from "@/server/db/schema";

type Stats = { commits30d: number; openPulls: number; lastCommitAt: Date | null };

/** Mini sparkline of daily commits — server-rendered, no motion needed at this size. */
function Spark({ days }: { days: { count: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div className="flex h-7 items-end gap-[2px]" aria-hidden>
      {days.map((d, i) => (
        <span key={i} className={d.count ? "w-1 rounded-[1px] bg-[#7fb0e8]/80" : "w-1 rounded-[1px] bg-surface-3"} style={{ height: d.count ? Math.max(4, (d.count / max) * 28) : 2 }} />
      ))}
    </div>
  );
}

/**
 * Development activity — deliberately separate from progress. GitHub tells us
 * something is happening, not how close the project is to done.
 */
export function ActivityPanel({ projectId, github, stats, cadence }: { projectId: string; github: ProjectGithubConnection | null; stats: Stats; cadence: { count: number }[] }) {
  const base = `/projects/${projectId}/github`;
  return (
    <div className="flex h-full flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <span className="eyebrow">Atividade de desenvolvimento</span>
        <span className="text-caption tracking-normal text-fg-subtle">GitHub · não representa progresso</span>
      </div>
      {github ? (
        <>
          <Link href={base} className="group flex items-end justify-between gap-4">
            <span className="flex items-baseline gap-2">
              <span className="font-numeric font-display text-[2.5rem] leading-none font-medium tracking-[-0.04em] text-fg-strong">{stats.commits30d}</span>
              <span className="text-body-sm text-fg-muted">{stats.commits30d === 1 ? "commit" : "commits"} em 30 dias</span>
            </span>
            <Spark days={cadence.slice(-21)} />
          </Link>
          <div className="mt-auto flex flex-col gap-1.5">
            <Link href={base} className="flex w-fit max-w-full items-center gap-2 font-mono text-[0.75rem] text-fg-muted transition-colors hover:text-fg-strong">
              <GithubMark className="size-3.5 shrink-0" />
              <span className="truncate">
                {github.githubOwner}/<span className="text-fg">{github.githubRepositoryName}</span>
              </span>
              {stats.openPulls > 0 && <span className="shrink-0 font-sans text-caption tracking-normal text-fg-subtle">· {stats.openPulls} PR{stats.openPulls > 1 ? "s" : ""} aberto{stats.openPulls > 1 ? "s" : ""}</span>}
            </Link>
            <SyncStatusLine status={github.syncStatus} lastSyncedAt={github.githubLastSyncedAt} className="[&_p]:text-caption [&_p]:tracking-normal" />
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-start justify-between gap-4">
          <p className="text-body-sm text-fg-muted">Nenhum repositório conectado. Commits, pull requests e releases aparecerão aqui.</p>
          <Link href={base} className="inline-flex h-8 items-center gap-2 rounded-sm px-2.5 text-body-sm text-fg shadow-[inset_0_0_0_1px_var(--color-line-2)] transition-colors hover:bg-surface-2 hover:text-fg-strong">
            <Plug className="size-3.5" aria-hidden />
            Conectar GitHub
          </Link>
        </div>
      )}
    </div>
  );
}
