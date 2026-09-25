import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "gold" | "identity" | "success" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-fg-muted shadow-[inset_0_0_0_1px_var(--color-line)]",
  accent: "bg-accent-soft text-accent shadow-[inset_0_0_0_1px_rgb(215_196_133/0.2)]",
  gold: "bg-gold-soft text-gold shadow-[inset_0_0_0_1px_rgb(181_158_95/0.22)]",
  identity: "bg-identity text-[#b8c5ea] shadow-[inset_0_0_0_1px_rgb(147_166_216/0.2)]",
  success: "bg-[rgb(134_185_156/0.1)] text-success shadow-[inset_0_0_0_1px_rgb(134_185_156/0.22)]",
  danger: "bg-danger-soft text-danger shadow-[inset_0_0_0_1px_rgb(224_146_143/0.22)]",
};

export function Badge({ children, tone = "neutral", className, icon }: { children: ReactNode; tone?: Tone; className?: string; icon?: ReactNode }) {
  return (
    <span className={cn("inline-flex h-5.5 items-center gap-1.5 rounded-xs px-1.5 text-caption font-medium tracking-normal whitespace-nowrap [&_svg]:size-3", tones[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

/** Monospace chip for codenames, identifiers and repository slugs. */
export function Code({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-xs bg-surface-2 px-1.5 py-px font-mono text-[0.6875rem] tracking-wide text-fg-muted shadow-[inset_0_0_0_1px_var(--color-line)]", className)}>
      {children}
    </span>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-xs bg-surface-3/70 px-1 font-mono text-[10px] text-fg-muted shadow-[inset_0_-1px_0_var(--color-line-2)]", className)}>
      {children}
    </kbd>
  );
}
