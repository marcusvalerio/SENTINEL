import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ActivityPanel } from "@/components/project/activity-panel";
import { ProgressPanel } from "@/components/project/progress-panel";
import { ProjectActions } from "@/components/project/project-actions";
import { ProjectSectionNav } from "@/components/project/section-nav";
import { StatusMenu } from "@/components/project/status-menu";
import { Code } from "@/components/ui/badge";
import { PROJECT_TYPE_LABELS } from "@/domain/project";
import { formatDate, formatRelative } from "@/lib/format";
import { loadProject } from "@/server/projects/context";
import { MilestonePanel } from "@/components/project/milestone-panel";
import { milestoneProgress } from "@/domain/progress";
import { getActivityStats, getCommitCadence, getMilestones } from "@/server/projects/intelligence";
import { getFeatures, getProjectCounts } from "@/server/projects/queries";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { project } = await loadProject(params);
  return { title: project.name };
}

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { project } = await loadProject(params);
  const [counts, milestones, features, stats, cadence] = await Promise.all([
    getProjectCounts(project.id),
    getMilestones(project.id),
    getFeatures(project.id),
    getActivityStats(project.id),
    project.github ? getCommitCadence(project.id) : Promise.resolve([]),
  ]);
  const countedMilestones = milestones.filter((m) => m.status !== "cancelled");

  const meta = [
    PROJECT_TYPE_LABELS[project.type],
    project.category,
    project.startedOn ? `Iniciado em ${formatDate(project.startedOn)}` : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative border-b border-line">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_100%_at_0%_0%,rgb(27_41_75/0.55),transparent_60%)]" aria-hidden />
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_90%_at_0%_0%,black,transparent)] opacity-60" aria-hidden />

        <div className="relative mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-4 pt-8 sm:px-6 sm:pt-10 lg:px-8">
          <div className="flex flex-col gap-5">
            <nav aria-label="Trilha" className="flex items-center gap-1.5 text-body-sm text-fg-subtle">
              <Link href="/" className="rounded-xs transition-colors hover:text-fg">
                Projetos
              </Link>
              <ChevronRight className="size-3.5" aria-hidden />
              <span className="truncate text-fg-muted" aria-current="page">
                {project.codename ?? project.name}
              </span>
            </nav>

            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <StatusMenu projectId={project.id} status={project.status} />
                  {project.codename && <Code>{project.codename}</Code>}
                </div>
                <h1 className="text-h1 break-words sm:text-display">{project.name}</h1>
                {project.summary && <p className="max-w-[68ch] text-body text-fg-muted sm:text-[1.0625rem] sm:leading-relaxed">{project.summary}</p>}
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-fg-subtle">
                  {meta.map((item, i) => (
                    <span key={i} className="flex items-center gap-2">
                      {i > 0 && <span className="size-0.5 rounded-full bg-fg-subtle" aria-hidden />}
                      {item}
                    </span>
                  ))}
                  <span className="flex items-center gap-2">
                    <span className="size-0.5 rounded-full bg-fg-subtle" aria-hidden />
                    <span suppressHydrationWarning>Atualizado {formatRelative(project.lastActivityAt)}</span>
                  </span>
                </p>
              </div>
              <ProjectActions projectId={project.id} name={project.name} />
            </div>
          </div>

          <section aria-label="Estado do projeto" className="grid overflow-hidden rounded-lg bg-surface/70 shadow-[inset_0_0_0_1px_var(--color-line)] backdrop-blur-sm md:grid-cols-3 md:divide-x md:divide-line max-md:divide-y max-md:divide-line">
            <ProgressPanel
              projectId={project.id}
              progress={project.progress}
              source={project.progressSource}
              features={counts.features}
              featuresDone={counts.featuresDone}
              milestones={countedMilestones.length}
              milestonesDone={countedMilestones.filter((m) => m.status === "completed").length}
            />
            <ActivityPanel projectId={project.id} github={project.github} stats={stats} cadence={cadence} />
            <MilestonePanel
              projectId={project.id}
              milestones={milestones.map((m) => ({ id: m.id, name: m.name, status: m.status, dueOn: m.dueOn, progress: milestoneProgress(m, features) }))}
            />
          </section>

          <ProjectSectionNav projectId={project.id} counts={{ rubrica: counts.notes, escopo: counts.features, roadmap: countedMilestones.length, ferramentas: counts.tools }} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1240px] flex-1 px-4 pt-8 pb-24 sm:px-6 sm:pt-10 lg:px-8">{children}</div>
    </div>
  );
}
