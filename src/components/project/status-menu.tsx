"use client";

import { ChevronDown } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { Dropdown } from "@/components/ui/dropdown";
import { StatusDot } from "@/components/ui/status";
import { useToast } from "@/components/ui/toast";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, type ProjectStatus } from "@/domain/project";
import { cn } from "@/lib/cn";
import { setProjectStatus } from "@/server/projects/actions";

/** Status changes are history: each one lands on the timeline. */
export function StatusMenu({ projectId, status }: { projectId: string; status: ProjectStatus }) {
  const [optimistic, setOptimistic] = useOptimistic(status);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const change = (next: ProjectStatus) => {
    if (next === optimistic) return;
    startTransition(async () => {
      setOptimistic(next);
      const result = await setProjectStatus(projectId, next);
      toast.show(
        result.ok
          ? { title: `Status: ${PROJECT_STATUS_LABELS[next]}`, description: "A mudança foi registrada na timeline." }
          : { tone: "error", title: "Não foi possível alterar o status", description: result.error },
      );
    });
  };

  return (
    <Dropdown
      align="start"
      width={220}
      trigger={({ ref, toggle, open, ...aria }) => (
        <button
          ref={ref}
          type="button"
          onClick={toggle}
          {...aria}
          aria-label={`Status: ${PROJECT_STATUS_LABELS[optimistic]}. Alterar status`}
          className={cn(
            "inline-flex h-7 items-center gap-2 rounded-sm bg-surface-2 pr-1.5 pl-2.5 text-caption font-medium tracking-normal text-fg shadow-[inset_0_0_0_1px_var(--color-line-2)] transition-[box-shadow,opacity] hover:shadow-[inset_0_0_0_1px_var(--color-line-3)]",
            pending && "opacity-70",
          )}
        >
          <StatusDot status={optimistic} />
          {PROJECT_STATUS_LABELS[optimistic]}
          <ChevronDown className={cn("size-3.5 text-fg-subtle transition-transform duration-200", open && "rotate-180")} />
        </button>
      )}
      items={[
        { type: "label", label: "Mover para" },
        ...PROJECT_STATUSES.map((s) => ({
          label: PROJECT_STATUS_LABELS[s],
          icon: <StatusDot status={s} className="mx-1" />,
          selected: s === optimistic,
          onSelect: () => change(s),
        })),
      ]}
    />
  );
}
