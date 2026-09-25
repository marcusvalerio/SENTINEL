import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { formatDate, formatTime } from "@/lib/format";
import type { ProjectTimelineEvent } from "@/server/db/schema";
import { TIMELINE_EMPHASIS, TIMELINE_ICONS } from "./timeline-meta";

export function TimelineList({ events, actions }: { events: ProjectTimelineEvent[]; actions?: (event: ProjectTimelineEvent) => React.ReactNode }) {
  return (
    <Timeline>
      {events.map((event, i) => (
        <TimelineItem key={event.id} last={i === events.length - 1} marker={TIMELINE_ICONS[event.type]} tone={TIMELINE_EMPHASIS.includes(event.type) ? "accent" : "default"}>
          <div className="group flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-body-sm font-medium text-fg-strong">{event.title}</p>
              {event.description && <p className="max-w-[64ch] text-body-sm whitespace-pre-line text-fg-muted">{event.description}</p>}
              <p className="flex items-center gap-2 text-caption tracking-normal text-fg-subtle">
                <span className="font-numeric" suppressHydrationWarning>
                  {formatDate(event.occurredAt)}
                  {event.source !== "manual" && ` · ${formatTime(event.occurredAt)}`}
                </span>
                <span className="size-0.5 rounded-full bg-fg-subtle" aria-hidden />
                <span>{event.source === "manual" ? "Registrado manualmente" : event.source === "github" ? "GitHub" : "Automático"}</span>
              </p>
            </div>
            {actions?.(event)}
          </div>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
