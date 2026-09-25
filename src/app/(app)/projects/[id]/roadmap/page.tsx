import { Route } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { loadProject } from "@/server/projects/context";

export const metadata = { title: "Roadmap" };

export default async function RoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  const { project } = await loadProject(params);
  return (
    <EmptyState
      icon={<Route />}
      title="O roadmap ainda não foi traçado."
      description="Ele será construído a partir das funcionalidades e milestones do projeto — organizados em etapas com datas."
      action={
        <ButtonLink href={`/projects/${project.id}/escopo`} variant="secondary" size="sm">
          Revisar escopo
        </ButtonLink>
      }
      secondary={
        <ButtonLink href={`/projects/${project.id}/timeline`} variant="ghost" size="sm">
          Registrar milestone
        </ButtonLink>
      }
    />
  );
}
