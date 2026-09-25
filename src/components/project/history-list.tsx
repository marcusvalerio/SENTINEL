import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import type { HistoryItem } from "@/domain/history";
import { TIMELINE_ORIGIN_LABELS } from "@/domain/timeline";
import { cn } from "@/lib/cn";
import { formatDate, formatTime } from "@/lib/format";
import { HISTORY_ICONS, ORIGIN_TONE, TIMELINE_EMPHASIS } from "./timeline-meta";

/** The project's story: each entry shows what happened, when, and where it came from. */
export function HistoryList({ items, actions, compact = false }: { items: HistoryItem[]; actions?: (item: HistoryItem) => ReactNode; compact?: boolean }) {
  return (
    <ol className="relative flex flex-col">
      {items.map((item, i) => {
        const tone = ORIGIN_TONE[item.origin];
        const emphasis = TIMELINE_EMPHASIS.includes(item.icon);
        return (
          <li key={item.id} className={cn("group relative flex gap-4", i === items.length - 1 ? "pb-0" : compact ? "pb-5" : "pb-6")}>
            {i < items.length - 1 && <span className="absolute top-6 bottom-0 left-[11px] w-px bg-line-2" aria-hidden />}
            <span
              className={cn(
                "relative z-10 mt-0.5 flex size-[23px] shrink-0 items-center justify-center rounded-full [&_svg]:size-3",
                emphasis ? cn("bg-identity", tone.text, tone.ring) : cn("bg-surface-2", tone.text, "shadow-[inset_0_0_0_1px_var(--color-line-2)]"),
              )}
              aria-hidden
            >
              {HISTORY_ICONS[item.icon]}
            </span>
            <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption tracking-normal">
                  <span className={cn("font-mono text-[0.625rem] tracking-[0.08em] uppercase", tone.text)}>{TIMELINE_ORIGIN_LABELS[item.origin]}</span>
                  <span className="text-fg-subtle">{item.label}</span>
                  {item.count && item.count > 1 && <span className="font-numeric rounded-xs bg-surface-2 px-1 text-fg-muted">{item.count}</span>}
                </p>
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer noopener" className="group/link flex w-fit max-w-full items-start gap-1 text-body-sm font-medium text-fg-strong hover:text-accent">
                    <span className="break-words">{item.title}</span>
                    <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-fg-subtle opacity-0 transition-opacity group-hover/link:opacity-100" aria-hidden />
                  </a>
                ) : (
                  <p className="text-body-sm font-medium break-words text-fg-strong">{item.title}</p>
                )}
                {item.description && <p className="max-w-[64ch] text-body-sm whitespace-pre-line text-fg-muted">{item.description}</p>}
                <p className="font-numeric text-caption tracking-normal text-fg-subtle" suppressHydrationWarning>
                  {formatDate(item.occurredAt)}
                  {item.source !== "manual" && ` · ${formatTime(item.occurredAt)}`}
                  {item.source === "manual" && " · registrado manualmente"}
                </p>
              </div>
              {actions?.(item)}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
