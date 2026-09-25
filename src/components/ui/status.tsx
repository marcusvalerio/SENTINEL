import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/domain/project";
import { cn } from "@/lib/cn";

export const STATUS_COLOR: Record<ProjectStatus, string> = {
  idea: "var(--color-status-idea)",
  planning: "var(--color-status-planning)",
  in_development: "var(--color-status-development)",
  validation: "var(--color-status-validation)",
  production: "var(--color-status-production)",
  paused: "var(--color-status-paused)",
  completed: "var(--color-status-completed)",
  archived: "var(--color-status-archived)",
};

const LIVE: ProjectStatus[] = ["in_development", "validation", "production"];

/** Status indicator: a dot that carries the hue + the label for meaning. */
export function StatusDot({ status, className }: { status: ProjectStatus; className?: string }) {
  const color = STATUS_COLOR[status];
  return (
    <span className={cn("relative inline-flex size-2 shrink-0", className)} aria-hidden>
      {LIVE.includes(status) && (
        <span className="absolute inset-0 animate-ping rounded-full opacity-30 [animation-duration:2.4s]" style={{ background: color }} />
      )}
      <span
        className={cn("relative size-2 rounded-full", status === "archived" && "bg-transparent")}
        style={status === "archived" ? { boxShadow: `inset 0 0 0 1.5px ${color}` } : { background: color }}
      />
    </span>
  );
}

export function StatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-2 rounded-xs bg-surface-2 pr-2 pl-2 text-caption font-medium tracking-normal text-fg shadow-[inset_0_0_0_1px_var(--color-line)]", className)}>
      <StatusDot status={status} />
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}
