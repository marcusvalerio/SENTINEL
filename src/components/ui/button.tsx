import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";
import { SuccessMark } from "./success-mark";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "identity";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "group/button relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-medium " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-250 ease-[var(--ease-out-quart)] " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 " +
  "[&_svg]:shrink-0";

const variants: Record<ButtonVariant, string> = {
  primary:
    "rounded-full border-2 border-accent bg-accent text-[#F5F4F0] shadow-none hover:border-[#202124] hover:bg-[#202124]",
  secondary:
    "rounded-full border-2 border-accent bg-transparent text-accent-fg shadow-none hover:bg-accent hover:text-[#F5F4F0]",
  ghost: "rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg-strong",
  danger:
    "rounded-full border border-danger/30 bg-danger-soft text-danger shadow-none hover:bg-[rgb(224_146_143/0.16)]",
  identity:
    "rounded-full border border-line-2 bg-identity text-fg-strong shadow-none hover:bg-identity-2",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-[42px] rounded-full px-5 text-body-sm [&_svg]:size-3.5",
  md: "h-[46px] rounded-full px-6 text-body-sm [&_svg]:size-4",
  lg: "h-[52px] rounded-full px-7 text-body [&_svg]:size-4",
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
  succeeded = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ComponentProps<"button"> & CommonProps & { loading?: boolean; succeeded?: boolean }) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : succeeded ? <SuccessMark /> : leading}
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
