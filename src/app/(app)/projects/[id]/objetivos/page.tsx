import { DocField, DocSection } from "@/components/project/doc";
import { loadProject } from "@/server/projects/context";

export const metadata = { title: "Objetivos" };

export default async function GoalsPage({ params }: { params: Promise<{ id: string }> }) {
  const { project } = await loadProject(params);
  const edit = `/projects/${project.id}/edit?step=context`;
  return (
    <div className="flex flex-col gap-10">
      <DocSection title="Por que existe" description="O problema e a intenção por trás do projeto." editHref={edit}>
        <DocField label="Objetivo principal" value={project.primaryGoal} emphasis />
        <DocField label="Problema" value={project.problem} />
        <DocField label="Objetivos secundários" value={project.secondaryGoals} />
      </DocSection>
      <DocSection title="Para quem" editHref={edit}>
        <div className="grid gap-6 md:grid-cols-2">
          <DocField label="Público" value={project.audience} />
          <DocField label="Quem utilizará" value={project.endUsers} />
        </div>
      </DocSection>
      <DocSection title="Resultado" description="Como o sucesso será reconhecido." editHref={edit}>
        <DocField label="Resultado esperado" value={project.expectedOutcome} />
        <DocField label="Critérios de sucesso" value={project.successCriteria} />
      </DocSection>
      <DocSection title="Observações" description="Contexto registrado no nascimento do projeto." editHref={`/projects/${project.id}/edit?step=notes`}>
        <DocField label="Observações" value={project.observations} />
      </DocSection>
    </div>
  );
}
