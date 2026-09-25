import { ToolsManager } from "@/components/project/tools-manager";
import { SectionHeader } from "@/components/ui/surface";
import { loadProject } from "@/server/projects/context";
import { getTools } from "@/server/projects/queries";

export const metadata = { title: "Ferramentas" };

export default async function ToolsPage({ params }: { params: Promise<{ id: string }> }) {
  const { project } = await loadProject(params);
  const tools = await getTools(project.id);
  return (
    <div className="flex flex-col gap-8">
      <SectionHeader title="Ferramentas" description="O que foi usado para construir este projeto e com qual finalidade." />
      <ToolsManager projectId={project.id} tools={tools.map((t) => ({ id: t.id, name: t.name, purpose: t.purpose, plan: t.plan }))} />
    </div>
  );
}
