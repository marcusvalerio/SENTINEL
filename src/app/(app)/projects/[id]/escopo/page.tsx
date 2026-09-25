import { DocField, DocSection } from "@/components/project/doc";
import { FeatureBoard } from "@/components/project/feature-board";
import { loadProject } from "@/server/projects/context";
import { getFeatures } from "@/server/projects/queries";

export const metadata = { title: "Escopo" };

export default async function ScopePage({ params }: { params: Promise<{ id: string }> }) {
  const { project } = await loadProject(params);
  const features = await getFeatures(project.id);
  return (
    <div className="flex flex-col gap-10">
      <DocSection
        title="Funcionalidades"
        description={
          project.progressSource === "features"
            ? "Marque o andamento de cada uma — o progresso do projeto é calculado a partir delas, ponderado pela prioridade."
            : "O progresso deste projeto está definido manualmente."
        }
      >
        <FeatureBoard projectId={project.id} features={features.map((f) => ({ id: f.id, name: f.name, description: f.description, priority: f.priority, status: f.status }))} />
      </DocSection>
      <DocSection title="Limites e dependências" editHref={`/projects/${project.id}/edit?step=scope`}>
        <DocField label="Funcionalidades obrigatórias" value={project.mandatoryFeatures} />
        <DocField label="Restrições técnicas" value={project.technicalConstraints} />
        <DocField label="Integrações necessárias" value={project.integrations} />
      </DocSection>
    </div>
  );
}
