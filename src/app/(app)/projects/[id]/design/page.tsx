import { ArrowUpRight, Link2 } from "lucide-react";
import { DocField, DocSection } from "@/components/project/doc";
import { ASSET_AVAILABILITY_LABELS, type AssetAvailability } from "@/domain/project";
import { cn } from "@/lib/cn";
import { loadProject } from "@/server/projects/context";
import { getReferences } from "@/server/projects/queries";

export const metadata = { title: "Design" };

function Asset({ label, value }: { label: string; value: AssetAvailability | null }) {
  return (
    <div className="flex flex-col gap-2 px-5 py-4">
      <span className="eyebrow">{label}</span>
      <span className="flex items-center gap-2 text-body-sm">
        <span
          className={cn(
            "size-1.5 rounded-full",
            value === "yes" && "bg-success",
            value === "in_progress" && "bg-warning",
            value === "no" && "bg-fg-subtle",
            !value && "bg-transparent shadow-[inset_0_0_0_1px_var(--color-fg-subtle)]",
          )}
          aria-hidden
        />
        <span className={value ? "text-fg-strong" : "text-fg-subtle italic"}>{value ? ASSET_AVAILABILITY_LABELS[value] : "Não informado"}</span>
      </span>
    </div>
  );
}

export default async function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { project } = await loadProject(params);
  const references = await getReferences(project.id);
  const edit = `/projects/${project.id}/edit?step=design`;

  return (
    <div className="flex flex-col gap-10">
      <DocSection title="Marca" description="O que já existe de identidade." editHref={edit}>
        <div className="grid divide-line overflow-hidden rounded-lg bg-surface/60 shadow-[inset_0_0_0_1px_var(--color-line)] sm:grid-cols-3 sm:divide-x max-sm:divide-y">
          <Asset label="Identidade visual" value={project.hasVisualIdentity} />
          <Asset label="Logo" value={project.hasLogo} />
          <Asset label="Manual de marca" value={project.hasBrandManual} />
        </div>
      </DocSection>
      <DocSection title="Direção" editHref={edit}>
        <DocField label="Sensação a transmitir" value={project.desiredFeeling} emphasis />
        <DocField label="Estilos a evitar" value={project.stylesToAvoid} />
      </DocSection>
      <DocSection title="Referências" description={`${references.length} ${references.length === 1 ? "referência" : "referências"}`} editHref={edit}>
        <DocField label="Referências visuais" value={project.visualReferencesNotes} />
        {references.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {references.map((ref) => {
              const inner = (
                <>
                  <span className="flex items-center gap-2">
                    <Link2 className="size-3.5 shrink-0 text-fg-subtle" aria-hidden />
                    <span className="truncate text-body-sm font-medium text-fg-strong">{ref.name}</span>
                    {ref.url && <ArrowUpRight className="ml-auto size-3.5 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />}
                  </span>
                  {ref.url && <span className="truncate font-mono text-[0.6875rem] text-fg-subtle">{ref.url.replace(/^https?:\/\//, "")}</span>}
                  {ref.description && <span className="line-clamp-2 text-body-sm text-fg-muted">{ref.description}</span>}
                </>
              );
              const cls = "group flex h-full flex-col gap-1.5 rounded-md bg-surface/60 p-4 shadow-[inset_0_0_0_1px_var(--color-line)] transition-shadow";
              return (
                <li key={ref.id}>
                  {ref.url ? (
                    <a href={ref.url} target="_blank" rel="noreferrer noopener" className={cn(cls, "hover:shadow-[inset_0_0_0_1px_var(--color-line-3)]")}>
                      {inner}
                    </a>
                  ) : (
                    <div className={cls}>{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DocSection>
    </div>
  );
}
