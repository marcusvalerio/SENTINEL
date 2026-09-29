"use client";

import { motion } from "motion/react";
import { Archive, Check, X } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { PRE_PROJECT_PIPELINE, PRE_PROJECT_STATUS_LABELS, type PreProjectStatus } from "@/domain/pre-projects";
import { cn } from "@/lib/cn";
import { setPreProjectStatus } from "@/server/pre-projects/actions";

/** The pipeline as a track: stages in order, outcomes apart. One click moves it. */
export function StatusTrack({ id, status }: { id: string; status: PreProjectStatus }) {
  const [current, setCurrent] = useOptimistic(status);
  const [, startTransition] = useTransition();
  const toast = useToast();
  const index = PRE_PROJECT_PIPELINE.indexOf(current);

  const move = (next: PreProjectStatus) =>
    startTransition(async () => {
      setCurrent(next);
      const result = await setPreProjectStatus(id, next);
      if (!result.ok) toast.show({ tone: "error", title: "Não foi possível mudar o status", description: result.error });
    });

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2" aria-label="Etapas">
        {PRE_PROJECT_PIPELINE.map((s, i) => {
          const reached = index >= i || current === "approved";
          const isCurrent = current === s;
          return (
            <li key={s} className="flex items-center gap-1">
              {i > 0 && <span className={cn("h-px w-4 sm:w-6", reached ? "bg-accent/50" : "bg-line-2")} aria-hidden />}
              <button
                type="button"
                onClick={() => move(s)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "relative flex h-8 items-center rounded-full px-3 text-caption font-medium tracking-normal transition-colors",
                  isCurrent ? "text-canvas" : reached ? "text-fg hover:text-fg-strong" : "text-fg-subtle hover:text-fg",
                )}
              >
                {isCurrent && <motion.span layoutId={`track-${id}`} className="absolute inset-0 rounded-full bg-accent" transition={{ type: "spring", stiffness: 480, damping: 36 }} />}
                <span className="relative">{PRE_PROJECT_STATUS_LABELS[s]}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-2">
        {(
          [
            { s: "approved", icon: <Check />, tone: "text-success" },
            { s: "declined", icon: <X />, tone: "text-danger" },
            { s: "archived", icon: <Archive />, tone: "text-fg-muted" },
          ] as const
        ).map(({ s, icon, tone }) => (
          <button
            key={s}
            type="button"
            onClick={() => move(s)}
            aria-pressed={current === s}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-full px-3 text-caption font-medium tracking-normal transition-colors [&_svg]:size-3.5",
              current === s ? cn("bg-surface-2 shadow-[inset_0_0_0_1px_var(--color-line-3)]", tone) : "text-fg-subtle shadow-[inset_0_0_0_1px_var(--color-line)] hover:text-fg",
            )}
          >
            {icon}
            {PRE_PROJECT_STATUS_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  );
}
