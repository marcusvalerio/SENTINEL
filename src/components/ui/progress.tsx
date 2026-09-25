"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";

type ProgressProps = {
  value: number;
  label?: string;
  size?: "xs" | "sm" | "md";
  tone?: "accent" | "neutral" | "identity";
  className?: string;
  showValue?: boolean;
};

export function Progress({ value, label, size = "sm", tone = "accent", className, showValue = false }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const fill = { accent: "bg-accent", neutral: "bg-fg-muted", identity: "bg-[#8fa6e0]" }[tone];
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={label}
        className={cn(
          "relative flex-1 overflow-hidden rounded-full bg-surface-3/70",
          { xs: "h-[3px]", sm: "h-1", md: "h-1.5" }[size],
        )}
      >
        <motion.div
          className={cn("absolute inset-y-0 left-0 rounded-full", fill)}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
        />
      </div>
      {showValue && <span className="font-numeric w-9 shrink-0 text-right text-body-sm text-fg-muted">{clamped}%</span>}
    </div>
  );
}
