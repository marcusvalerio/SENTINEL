import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Timeline primitive: a quiet spine with markers. Content decides what an
 * event looks like; this only provides rhythm and structure.
 */
export function Timeline({ children, className }: { children: ReactNode; className?: string }) {
  return <ol className={cn("relative flex flex-col", className)}>{children}</ol>;
}

export function TimelineItem({
  marker,
  children,
  last = false,
  tone = "default",
}: {
  marker?: ReactNode;
  children: ReactNode;
  last?: boolean;
  tone?: "default" | "accent" | "muted";
}) {
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {!last && <span className="absolute top-6 bottom-0 left-[11px] w-px bg-line-2" aria-hidden />}
      <span
        className={cn(
          "relative z-10 mt-0.5 flex size-[23px] shrink-0 items-center justify-center rounded-full [&_svg]:size-3",
          tone === "accent" && "bg-identity text-accent shadow-[inset_0_0_0_1px_rgb(215_196_133/0.35)]",
          tone === "default" && "bg-surface-2 text-fg-muted shadow-[inset_0_0_0_1px_var(--color-line-2)]",
          tone === "muted" && "bg-canvas text-fg-subtle shadow-[inset_0_0_0_1px_var(--color-line-2)]",
        )}
        aria-hidden
      >
        {marker ?? <span className="size-1.5 rounded-full bg-current" />}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}
