import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "identity";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "group/button relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-medium " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-[var(--ease-out-quart)] " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 " +
  "[&_svg]:shrink-0";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-fg-on-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_1px_2px_rgb(0_0_0/0.35)] hover:bg-accent-hover",
  secondary:
    "bg-surface-2 text-fg-strong shadow-[inset_0_0_0_1px_var(--color-line-2),inset_0_1px_0_rgb(255_255_255/0.03)] hover:bg-surface-3 hover:shadow-[inset_0_0_0_1px_var(--color-line-3)]",
  ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg-strong",
  danger:
    "bg-danger-soft text-danger shadow-[inset_0_0_0_1px_rgb(224_146_143/0.25)] hover:bg-[rgb(224_146_143/0.16)]",
  identity:
    "bg-identity text-fg-strong shadow-[inset_0_0_0_1px_rgb(147_166_216/0.18),inset_0_1px_0_rgb(255_255_255/0.05)] hover:bg-identity-2",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 rounded-sm px-2.5 text-body-sm [&_svg]:size-3.5",
  md: "h-9 rounded-md px-3.5 text-body-sm [&_svg]:size-4",
  lg: "h-11 rounded-md px-5 text-body [&_svg]:size-4",
};

export function buttonStyles({
  variant = "secondary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export function Button({
  variant,
  size,
  leading,
  trailing,
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ComponentProps<"button"> & CommonProps & { loading?: boolean }) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : leading}
      {children}
      {trailing}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  leading,
  trailing,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & CommonProps) {
  return (
    <Link className={buttonStyles({ variant, size, className })} {...props}>
      {leading}
      {children}
      {trailing}
    </Link>
  );
}
