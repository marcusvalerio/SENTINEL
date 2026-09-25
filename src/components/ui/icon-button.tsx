import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Tooltip } from "./tooltip";

type IconButtonProps = ComponentProps<"button"> & {
  /** Required: icon-only controls must have an accessible name. */
  label: string;
  size?: "sm" | "md";
  tone?: "default" | "danger";
  showTooltip?: boolean;
};

export function IconButton({
  label,
  size = "md",
  tone = "default",
  showTooltip = true,
  className,
  children,
  type = "button",
  ...props
}: IconButtonProps) {
  const button = (
    <button
      type={type}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-sm text-fg-muted transition-colors duration-150",
        "hover:bg-surface-2 hover:text-fg-strong disabled:pointer-events-none disabled:opacity-40",
        tone === "danger" && "hover:bg-danger-soft hover:text-danger",
        size === "sm" ? "size-7 [&_svg]:size-3.5" : "size-9 [&_svg]:size-4",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
  return showTooltip ? <Tooltip content={label}>{button}</Tooltip> : button;
}
