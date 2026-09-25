import { History } from "lucide-react";
import { TimelineList } from "@/components/project/timeline-list";
import { AddTimelineEvent, DeleteTimelineEvent } from "@/components/project/timeline-manager";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/surface";
import { loadProject } from "@/server/projects/context";
import { getTimeline } from "@/server/projects/queries";

export const metadata = { title: "Timeline" };

export default async function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { project } = await loadProject(params);
  const events = await getTimeline(project.id);

  const byYear = new Map<number, typeof events>();
  for (const event of events) {
    const year = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "America/Sao_Paulo" }).format(event.occurredAt));
    byYear.set(year, [...(byYear.get(year) ?? []), event]);
  }

  return (
    <div className="mx-auto flex max-w-[920px] flex-col gap-10">
      <SectionHeader
        title="Timeline"
        description="Eventos datados da vida do projeto. Mudanças de status, escopo e conexões são registradas automaticamente."
        action={<AddTimelineEvent projectId={project.id} />}
      />
      {events.length === 0 ? (
        <EmptyState compact icon={<History />} title="Nenhum evento registrado." />
      ) : (
        Array.from(byYear.entries()).map(([year, items]) => (
          <section key={year} className="grid gap-5 md:grid-cols-[120px_minmax(0,1fr)] md:gap-8">
            <h2 className="font-numeric font-display text-h2 font-medium text-fg-subtle md:sticky md:top-20 md:self-start">{year}</h2>
            <TimelineList
              events={items}
              actions={(event) => (event.source === "manual" ? <DeleteTimelineEvent projectId={project.id} eventId={event.id} title={event.title} /> : null)}
            />
          </section>
        ))
      )}
    </div>
  );
}
