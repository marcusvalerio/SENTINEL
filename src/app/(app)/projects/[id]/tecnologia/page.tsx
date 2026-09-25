import { Cpu } from "lucide-react";
import { DocField, DocSection } from "@/components/project/doc";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { loadProject } from "@/server/projects/context";

export const metadata = { title: "Tecnologia" };

export default async function TechPage({ params }: { params: Promise<{ id: string }> }) {
  const { project } = await loadProject(params);
  const hasContext = Boolean(project.technicalConstraints || project.integrations);
  return (
    <div className="flex flex-col gap-10">
      <EmptyState
        icon={<Cpu />}
        title="Nenhuma tecnologia registrada."
        description="Stack, infraestrutura e arquitetura terão um espaço dedicado. Decisões técnicas já podem ser registradas na Rubrica."
        action={
          <ButtonLink href={`/projects/${project.id}/rubrica?new=decision`} variant="secondary" size="sm">
            Registrar decisão técnica
          </ButtonLink>
        }
      />
      {hasContext && (
        <DocSection title="Contexto técnico" description="Registrado no escopo do projeto." editHref={`/projects/${project.id}/edit?step=scope`}>
          <DocField label="Restrições técnicas" value={project.technicalConstraints} />
          <DocField label="Integrações" value={project.integrations} />
        </DocSection>
      )}
    </div>
  );
}
