import Link from "next/link";
import { CalendarClock, Flag } from "lucide-react";
import { milestoneDueState, type MilestoneStatus } from "@/domain/milestones";
import { cn } from "@/lib/cn";
import { dayKey, formatDate } from "@/lib/format";

type M = { id: string; name: string; status: MilestoneStatus; dueOn: string | null; progress: number };

/** Where the project is on its roadmap: the milestone in focus and the overall count. */
export function MilestonePanel({ projectId, milestones }: { projectId: string; milestones: M[] }) {
  const base = `/projects/${projectId}/roadmap`;
  const counted = milestones.filter((m) => m.status !== "cancelled");
  const done = counted.filter((m) => m.status === "completed").length;
  const focus = milestones.find((m) => m.status === "active") ?? milestones.find((m) => m.status === "planned") ?? null;
  const due = focus ? milestoneDueState(focus, dayKey(new Date())) : "none";

  return (
    <div className="flex h-full flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <span className="eyebrow">Milestones</span>
        <span className="text-caption tracking-normal text-fg-subtle">{counted.length ? `${done} de ${counted.length} concluídos` : "Roadmap ainda não definido"}</span>
      </div>
      {focus ? (
        <Link href={`${base}#milestone-${focus.id}`} className="group flex flex-1 flex-col gap-3">
          <span className="flex flex-col gap-1">
            <span className={cn("text-caption tracking-normal", focus.status === "active" ? "text-[#9fc4ee]" : "text-fg-subtle")}>{focus.status === "active" ? "Em andamento" : "Próximo"}</span>
            <span className="line-clamp-2 font-display text-h4 font-medium text-fg-strong group-hover:text-accent">{focus.name}</span>
          </span>
          <span className="mt-auto flex flex-col gap-2">
            <span className="flex h-1 overflow-hidden rounded-full bg-surface-3/70" aria-hidden>
              <span className="rounded-full bg-[#8fa6e0]" style={{ width: `${focus.progress}%` }} />
            </span>
            <span className="flex items-center justify-between gap-2 text-caption tracking-normal">
              <span className={cn("flex items-center gap-1.5", due === "overdue" ? "text-danger" : due === "soon" ? "text-warning" : "text-fg-muted")}>
                <CalendarClock className="size-3" aria-hidden />
                {focus.dueOn ? `${due === "overdue" ? "Atrasado · " : ""}${formatDate(focus.dueOn)}` : "Sem data prevista"}
              </span>
              <span className="font-numeric text-fg">{focus.progress}%</span>
            </span>
          </span>
        </Link>
      ) : (
        <div className="flex flex-1 flex-col items-start justify-between gap-4">
          <p className="text-body-sm text-fg-muted">{counted.length ? "Todos os milestones foram concluídos." : "Divida o projeto em etapas com data para acompanhar o caminho."}</p>
          <Link href={base} className="inline-flex h-8 items-center gap-2 rounded-sm px-2.5 text-body-sm text-fg shadow-[inset_0_0_0_1px_var(--color-line-2)] transition-colors hover:bg-surface-2 hover:text-fg-strong">
            <Flag className="size-3.5" aria-hidden />
            {counted.length ? "Ver roadmap" : "Criar milestone"}
          </Link>
        </div>
      )}
    </div>
  );
}
