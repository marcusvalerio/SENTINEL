import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  secondary?: ReactNode;
  className?: string;
  compact?: boolean;
};

/**
 * Empty states explain what will live here and offer the next step. The icon
 * sits in a small "instrument" frame with concentric hairlines, echoing the
 * SENTINEL mark — never an illustration or emoji.
 */
export function EmptyState({ icon, title, description, action, secondary, className, compact = false }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center overflow-hidden rounded-lg text-center",
        "bg-[radial-gradient(ellipse_at_top,rgb(27_41_75/0.45),transparent_65%)] shadow-[inset_0_0_0_1px_var(--color-line)]",
        compact ? "gap-3 px-6 py-10" : "gap-4 px-6 py-16 sm:py-20",
        className,
      )}
    >
      <div className="relative flex items-center justify-center" aria-hidden>
        <span className="absolute size-24 rounded-full border border-line" />
        <span className="absolute size-16 rounded-full border border-line-2 border-dashed" />
        <span className="relative flex size-11 items-center justify-center rounded-md bg-surface-2 text-fg-muted shadow-[inset_0_0_0_1px_var(--color-line-2),0_8px_24px_-8px_rgb(0_0_0/0.6)] [&_svg]:size-5 [&_svg]:stroke-[1.5]">
          {icon}
        </span>
      </div>
      <div className={cn("flex max-w-sm flex-col gap-1.5", compact ? "mt-3" : "mt-6")}>
        <h3 className="text-h4 text-fg-strong">{title}</h3>
        {description && <p className="text-body-sm text-fg-muted">{description}</p>}
      </div>
      {(action || secondary) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondary}
        </div>
      )}
    </div>
  );
}
