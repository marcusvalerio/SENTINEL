import { DecisionLog } from "@/components/decisions/decision-log";
import { SectionHeader } from "@/components/ui/surface";
import { listDecisions } from "@/server/decisions/queries";
import { loadProject } from "@/server/projects/context";

export const metadata = { title: "Decisões" };

export default async function DecisionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { project } = await loadProject(params);
  const decisions = await listDecisions(project.id);
  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-8">
      <SectionHeader title="Decisões" />
      <DecisionLog
        projectId={project.id}
        decisions={decisions.map((d) => ({
          id: d.id,
          title: d.title,
          context: d.context,
          problem: d.problem,
          alternatives: d.alternatives,
          decision: d.decision,
          impact: d.impact,
          status: d.status,
          decidedOn: d.decidedOn,
          createdAt: d.createdAt.toISOString(),
          fromNote: !!d.noteId,
        }))}
      />
    </div>
  );
}
