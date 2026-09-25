import { GithubConnect } from "@/components/project/github-connect";
import { SectionHeader } from "@/components/ui/surface";
import { loadProject } from "@/server/projects/context";

export const metadata = { title: "GitHub" };

export default async function GithubPage({ params }: { params: Promise<{ id: string }> }) {
  const { project } = await loadProject(params);
  const g = project.github;
  return (
    <div className="flex flex-col gap-8">
      <SectionHeader title="GitHub" description="O repositório deste projeto. Atividade de código é acompanhada separadamente do progresso." />
      <GithubConnect
        projectId={project.id}
        projectName={project.name}
        connection={
          g
            ? {
                owner: g.githubOwner,
                name: g.githubRepositoryName,
                url: g.githubRepositoryUrl,
                defaultBranch: g.githubDefaultBranch,
                isPrivate: g.isPrivate,
                verified: g.verified,
                connectedAt: g.githubConnectedAt.toISOString(),
                lastSyncedAt: g.githubLastSyncedAt?.toISOString() ?? null,
              }
            : null
        }
      />
    </div>
  );
}
