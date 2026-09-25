import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type SurfaceProps = ComponentProps<"div"> & { variant?: "plain" | "raised" | "sunken" | "identity"; padded?: boolean };

/** A region of the interface. Hairline + tone instead of heavy shadows. */
export function Surface({ variant = "plain", padded = false, className, ...props }: SurfaceProps) {
  return (
    <div
      className={cn(
        "rounded-lg",
        variant === "plain" && "bg-surface shadow-[inset_0_0_0_1px_var(--color-line)]",
        variant === "raised" && "bg-surface-2 shadow-[inset_0_0_0_1px_var(--color-line-2)]",
        variant === "sunken" && "bg-sunken shadow-[inset_0_0_0_1px_var(--color-line)]",
        variant === "identity" && "bg-identity shadow-[inset_0_0_0_1px_rgb(147_166_216/0.14)]",
        padded && "p-5 sm:p-6",
        className,
      )}
      {...props}
    />
  );
}

/** Section heading used inside pages: small mono eyebrow + optional action. */
export function SectionHeader({ title, description, action, className }: { title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-h3">{title}</h2>
        {description && <p className="text-body-sm text-fg-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
