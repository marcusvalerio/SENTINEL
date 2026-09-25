"use client";

import { useId } from "react";
import { FEATURE_PRIORITIES, FEATURE_PRIORITY_LABELS, type FeaturePriority } from "@/domain/project";
import { cn } from "@/lib/cn";

export const PRIORITY_TONE: Record<FeaturePriority, string> = {
  essential: "bg-accent",
  important: "bg-[#93a6d8]",
  desirable: "bg-fg-subtle",
};

/** Compact segmented radio for feature priority. */
export function PriorityPicker({ value, onChange, label }: { value: FeaturePriority; onChange: (v: FeaturePriority) => void; label: string }) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex h-8 shrink-0 items-center rounded-sm bg-sunken p-0.5 shadow-[inset_0_0_0_1px_var(--color-line)]">
      {FEATURE_PRIORITIES.map((p) => (
        <label
          key={p}
          className={cn(
            "flex h-7 cursor-pointer items-center gap-1.5 rounded-xs px-2 text-caption font-medium tracking-normal transition-colors has-[:focus-visible]:shadow-focus",
            value === p ? "bg-surface-3 text-fg-strong shadow-[inset_0_0_0_1px_var(--color-line-2)]" : "text-fg-subtle hover:text-fg",
          )}
        >
          <input type="radio" name={name} value={p} checked={value === p} onChange={() => onChange(p)} className="sr-only" />
          <span className={cn("size-1.5 rounded-full", PRIORITY_TONE[p], value !== p && "opacity-50")} aria-hidden />
          {FEATURE_PRIORITY_LABELS[p]}
        </label>
      ))}
    </div>
  );
}
