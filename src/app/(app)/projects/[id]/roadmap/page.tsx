import { MilestoneBoard } from "@/components/project/milestone-board";
import { SectionHeader } from "@/components/ui/surface";
import { milestoneProgress } from "@/domain/progress";
import { loadProject } from "@/server/projects/context";
import { getMilestones } from "@/server/projects/intelligence";
import { getFeatures } from "@/server/projects/queries";

export const metadata = { title: "Roadmap" };

export default async function RoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  const { project } = await loadProject(params);
  const [milestones, features] = await Promise.all([getMilestones(project.id), getFeatures(project.id)]);

  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-8">
      <SectionHeader
        title="Roadmap"
        description={
          project.progressSource === "milestones"
            ? "Milestones do projeto. O progresso do projeto é calculado a partir deles."
            : "Milestones do projeto: etapas com data, cada uma com as funcionalidades que a compõem."
        }
      />
      <MilestoneBoard
        projectId={project.id}
        features={features.map((f) => ({ id: f.id, name: f.name, status: f.status, milestoneId: f.milestoneId }))}
        milestones={milestones.map((m) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          status: m.status,
          priority: m.priority,
          startedOn: m.startedOn,
          dueOn: m.dueOn,
          completedAt: m.completedAt?.toISOString() ?? null,
          progress: milestoneProgress(m, features),
          featureIds: features.filter((f) => f.milestoneId === m.id).map((f) => f.id),
        }))}
      />
    </div>
  );
}
