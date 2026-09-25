import { GitBranch, Shield, Users } from "lucide-react";
import { ActivityFeed } from "@/components/github/activity-feed";
import { CommitCadence } from "@/components/github/cadence";
import { ConnectRepository } from "@/components/github/connect-repository";
import { RepositoryHeader } from "@/components/github/repository-header";
import { SectionHeader, Surface } from "@/components/ui/surface";
import { formatRelative } from "@/lib/format";
import { loadProject } from "@/server/projects/context";
import { getActivity, getActivityStats, getCommitCadence } from "@/server/projects/intelligence";

export const metadata = { title: "GitHub" };

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5 px-5 py-4">
      <span className="eyebrow">{label}</span>
      <span className="font-numeric font-display text-h2 leading-none font-medium tracking-[-0.02em] text-fg-strong">{value}</span>
      {hint && <span className="text-caption tracking-normal text-fg-subtle">{hint}</span>}
    </div>
  );
}

export default async function GithubPage({ params }: { params: Promise<{ id: string }> }) {
  const { project } = await loadProject(params);
  const g = project.github;

  if (!g) {
    return (
      <div className="flex flex-col gap-8">
        <SectionHeader title="GitHub" description="Conecte o repositório deste projeto. Opcional — nem todo projeto tem código." />
        <ConnectRepository projectId={project.id} projectName={project.name} />
      </div>
    );
  }

  const [stats, cadence, commits, pulls, issues, releases] = await Promise.all([
    getActivityStats(project.id),
    getCommitCadence(project.id),
    getActivity(project.id, "commit", 50),
    getActivity(project.id, "pull_request", 50),
    getActivity(project.id, "issue", 50),
    getActivity(project.id, "release", 30),
  ]);
  const items = [...commits, ...pulls, ...issues, ...releases].map((a) => ({
    id: a.id,
    kind: a.kind,
    number: a.number,
    title: a.title,
    body: a.body,
    state: a.state,
    authorLogin: a.authorLogin,
    authorAvatarUrl: a.authorAvatarUrl,
    url: a.url,
    occurredAt: a.occurredAt.toISOString(),
    closedAt: a.closedAt?.toISOString() ?? null,
    metadata: a.metadata,
  }));
  const synced = g.syncStatus === "success" || g.githubLastSyncedAt !== null;

  return (
    <div className="flex flex-col gap-8">
      <RepositoryHeader
        projectId={project.id}
        projectName={project.name}
        connection={{
          owner: g.githubOwner,
          name: g.githubRepositoryName,
          url: g.githubRepositoryUrl,
          description: g.description,
          defaultBranch: g.githubDefaultBranch,
          isPrivate: g.isPrivate,
          verified: g.verified,
          lastPushedAt: g.lastPushedAt?.toISOString() ?? null,
          syncStatus: g.syncStatus,
          syncError: g.syncError,
          lastSyncedAt: g.githubLastSyncedAt?.toISOString() ?? null,
        }}
      />

      {synced && (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Surface className="grid grid-cols-2 divide-line overflow-hidden sm:grid-cols-4 sm:divide-x max-sm:[&>*:nth-child(-n+2)]:border-b max-sm:[&>*:nth-child(-n+2)]:border-line max-sm:[&>*:nth-child(odd)]:border-r max-sm:[&>*:nth-child(odd)]:border-line lg:col-span-2">
              <Stat label="Commits · 30 dias" value={stats.commits30d} hint={stats.lastCommitAt ? `último ${formatRelative(stats.lastCommitAt)}` : "nenhum commit recente"} />
              <Stat label="PRs abertos" value={stats.openPulls} hint={`${stats.mergedPulls} integrados`} />
              <Stat label="Issues abertas" value={stats.openIssues} />
              <Stat label="Releases" value={stats.releases} />
            </Surface>
          </div>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
            <ActivityFeed items={items} counts={{ commit: commits.length, pull_request: pulls.length, issue: issues.length, release: releases.length }} />

            <aside className="flex min-w-0 flex-col gap-6">
              <Surface padded>
                <h2 className="eyebrow mb-4">Cadência</h2>
                <CommitCadence days={cadence} />
              </Surface>

              <Surface padded>
                <h2 className="eyebrow mb-4 flex items-center gap-2">
                  <GitBranch className="size-3.5" aria-hidden />
                  Branches <span className="font-numeric text-fg-subtle">{g.branches.length}</span>
                </h2>
                {g.branches.length === 0 ? (
                  <p className="text-body-sm text-fg-subtle">Nenhuma branch encontrada.</p>
                ) : (
                  <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                    {g.branches.map((b) => (
                      <li key={b.name} className="flex min-w-0 items-center gap-2 text-body-sm">
                        <span className="min-w-0 truncate font-mono text-[0.75rem] text-fg" title={b.name}>{b.name}</span>
                        {b.name === g.githubDefaultBranch && <span className="text-caption tracking-normal text-accent">padrão</span>}
                        {b.protected && <Shield className="size-3 shrink-0 text-fg-subtle" aria-label="Protegida" />}
                        <span className="ml-auto font-mono text-[0.6875rem] text-fg-subtle">{b.sha}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Surface>

              <Surface padded>
                <h2 className="eyebrow mb-4 flex items-center gap-2">
                  <Users className="size-3.5" aria-hidden />
                  Contribuidores <span className="font-numeric text-fg-subtle">{g.contributors.length}</span>
                </h2>
                {g.contributors.length === 0 ? (
                  <p className="text-body-sm text-fg-subtle">Nenhum contribuidor encontrado.</p>
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {g.contributors.slice(0, 12).map((c) => (
                      <li key={c.login} className="flex min-w-0 items-center gap-2.5 text-body-sm">
                        {c.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`${c.avatarUrl}${c.avatarUrl.includes("?") ? "&" : "?"}s=48`} alt="" width={22} height={22} className="size-[22px] rounded-full bg-surface-3" loading="lazy" />
                        ) : (
                          <span className="size-[22px] rounded-full bg-surface-3" aria-hidden />
                        )}
                        <a href={c.url ?? undefined} target="_blank" rel="noreferrer noopener" className="truncate text-fg hover:text-accent">
                          {c.login}
                        </a>
                        <span className="font-numeric ml-auto text-caption text-fg-subtle">{c.contributions}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Surface>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
