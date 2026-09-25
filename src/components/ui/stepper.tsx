"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export type Step = { key: string; label: string; description?: string; icon?: React.ReactNode };

type StepperProps = {
  steps: Step[];
  current: number;
  /** Steps the user already went through (or may jump to). */
  reachable: (index: number) => boolean;
  complete: (index: number) => boolean;
  onSelect: (index: number) => void;
  hasError?: (index: number) => boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Vertical stepper — a numbered instrument rail with a filling spine. */
export function Stepper({ steps, current, reachable, complete, onSelect, hasError }: StepperProps) {
  return (
    <ol className="relative flex flex-col" aria-label="Etapas">
      <span className="absolute top-3 bottom-3 left-[11px] w-px bg-line-2" aria-hidden>
        <motion.span
          className="absolute inset-x-0 top-0 bg-accent/70"
          initial={false}
          animate={{ height: `${(current / Math.max(steps.length - 1, 1)) * 100}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </span>
      {steps.map((step, index) => {
        const isCurrent = index === current;
        const isDone = complete(index) && !isCurrent;
        const canGo = reachable(index);
        const error = hasError?.(index);
        return (
          <li key={step.key} className="relative">
            <button
              type="button"
              onClick={() => canGo && onSelect(index)}
              disabled={!canGo}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "group flex w-full items-start gap-3.5 rounded-md py-2.5 pr-2 text-left transition-colors",
                canGo ? "cursor-pointer" : "cursor-default",
              )}
            >
              <span
                className={cn(
                  "relative z-10 flex size-[23px] shrink-0 items-center justify-center rounded-full font-mono text-[10px] transition-all duration-200",
                  isCurrent && "bg-accent text-fg-on-accent shadow-[0_0_0_4px_rgb(215_196_133/0.12)]",
                  isDone && !error && "bg-identity text-accent shadow-[inset_0_0_0_1px_rgb(215_196_133/0.35)]",
                  error && !isCurrent && "bg-danger-soft text-danger shadow-[inset_0_0_0_1px_rgb(224_146_143/0.4)]",
                  !isCurrent && !isDone && !error && "bg-canvas text-fg-subtle shadow-[inset_0_0_0_1px_var(--color-line-3)]",
                  canGo && !isCurrent && "group-hover:shadow-[inset_0_0_0_1px_var(--color-accent)]",
                )}
              >
                {isDone && !error ? <Check className="size-3 stroke-[2.5]" /> : (step.icon ?? pad(index + 1))}
              </span>
              <span className="flex min-w-0 flex-col pt-0.5">
                <span
                  className={cn(
                    "text-body-sm font-medium transition-colors",
                    isCurrent ? "text-fg-strong" : canGo ? "text-fg-muted group-hover:text-fg-strong" : "text-fg-subtle",
                  )}
                >
                  {step.label}
                </span>
                {step.description && <span className="text-caption tracking-normal text-fg-subtle">{step.description}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Compact horizontal indicator for small screens. */
export function StepperBar({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-surface-3">
          <motion.span
            className="absolute inset-0 origin-left rounded-full bg-accent"
            initial={false}
            animate={{ scaleX: i < current ? 1 : i === current ? 0.5 : 0, opacity: i <= current ? 1 : 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        </span>
      ))}
    </div>
  );
}

export function stepCounter(current: number, total: number) {
  return `${pad(current + 1)} / ${pad(total)}`;
}
