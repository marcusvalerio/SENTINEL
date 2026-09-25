import { History } from "lucide-react";
import Link from "next/link";
import { HistoryList } from "@/components/project/history-list";
import { ORIGIN_TONE } from "@/components/project/timeline-meta";
import { AddTimelineEvent, DeleteTimelineEvent } from "@/components/project/timeline-manager";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/surface";
import { TIMELINE_ORIGINS, TIMELINE_ORIGIN_LABELS, type TimelineOrigin } from "@/domain/timeline";
import { cn } from "@/lib/cn";
import { loadProject } from "@/server/projects/context";
import { getHistory } from "@/server/projects/intelligence";

export const metadata = { title: "Timeline" };

export default async function TimelinePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ origin?: string }> }) {
  const [{ project }, { origin: rawOrigin }] = await Promise.all([loadProject(params), searchParams]);
  const origin = TIMELINE_ORIGINS.includes(rawOrigin as TimelineOrigin) ? (rawOrigin as TimelineOrigin) : undefined;
  const items = await getHistory(project.id, origin);
  const base = `/projects/${project.id}/timeline`;

  const byMonth = new Map<string, typeof items>();
  const monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
  for (const item of items) {
    const key = monthFmt.format(item.occurredAt);
    byMonth.set(key, [...(byMonth.get(key) ?? []), item]);
  }

  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-8">
      <SectionHeader
        title="Timeline"
        description="A história do projeto: decisões da Rubrica, milestones, mudanças e o que aconteceu no código — cada evento com a sua origem."
        action={<AddTimelineEvent projectId={project.id} />}
      />

      <nav aria-label="Filtrar por origem" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {[undefined, ...TIMELINE_ORIGINS].map((o) => {
          const active = o === origin;
          return (
            <Link
              key={o ?? "all"}
              href={o ? `${base}?origin=${o}` : base}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-7 shrink-0 items-center gap-2 rounded-full px-3 text-caption font-medium tracking-normal transition-colors",
                active ? "bg-fg-strong text-canvas" : "text-fg-muted shadow-[inset_0_0_0_1px_var(--color-line-2)] hover:text-fg-strong",
              )}
            >
              {o && <span className={cn("size-1.5 rounded-full", ORIGIN_TONE[o].dot)} aria-hidden />}
              {o ? TIMELINE_ORIGIN_LABELS[o] : "Tudo"}
            </Link>
          );
        })}
      </nav>

      {items.length === 0 ? (
        <EmptyState
          compact
          icon={<History />}
          title={origin === "development" ? "Nenhuma atividade de desenvolvimento ainda." : origin ? `Nenhum evento de ${TIMELINE_ORIGIN_LABELS[origin].toLowerCase()}.` : "Nenhum evento registrado."}
          description={origin === "development" ? "Conecte e sincronize o repositório GitHub para que commits, pull requests e releases entrem na história." : undefined}
        />
      ) : (
        <div className="flex flex-col gap-10">
          {Array.from(byMonth.entries()).map(([month, monthItems]) => (
            <section key={month} className="grid gap-5 md:grid-cols-[150px_minmax(0,1fr)] md:gap-8">
              <h2 className="font-display text-h4 font-medium text-fg-subtle first-letter:uppercase md:sticky md:top-20 md:self-start">{month}</h2>
              <HistoryList
                items={monthItems}
                actions={(item) => (item.removable ? <DeleteTimelineEvent projectId={project.id} eventId={item.id} title={item.title} /> : null)}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
