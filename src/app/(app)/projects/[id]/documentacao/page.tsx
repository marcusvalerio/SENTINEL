import { FileText } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { loadProject } from "@/server/projects/context";

export const metadata = { title: "Documentação" };

export default async function DocsPage({ params }: { params: Promise<{ id: string }> }) {
  const { project } = await loadProject(params);
  return (
    <EmptyState
      icon={<FileText />}
      title="Nenhum documento registrado."
      description="Especificações, contratos, atas e guias do projeto terão um lugar aqui. Enquanto isso, a Rubrica guarda o que precisa ser lembrado."
      action={
        <ButtonLink href={`/projects/${project.id}/rubrica?new=reference`} variant="secondary" size="sm">
          Registrar referência na Rubrica
        </ButtonLink>
      }
    />
  );
}
