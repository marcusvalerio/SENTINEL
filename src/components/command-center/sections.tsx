import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { StatusDot } from "@/components/ui/status";
import type { AttentionItem } from "@/domain/health";
import type { ProjectStatus } from "@/domain/project";
import { cn } from "@/lib/cn";
import { dayKey, formatDate, formatRelative } from "@/lib/format";
import { ORIGIN_TONE } from "@/components/project/timeline-meta";
import type { TimelineOrigin } from "@/domain/timeline";

/** An open section: a quiet label, optional action, and content. No box. */
export function Section({ title, action, children, className, id }: { title: string; action?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section aria-labelledby={id} className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={id} className="eyebrow">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const SEVERITY: Record<AttentionItem["severity"], { dot: string; label: string }> = {
  high: { dot: "bg-danger", label: "Alta" },
  medium: { dot: "bg-warning", label: "Média" },
  low: { dot: "bg-fg-subtle", label: "Baixa" },
};

export function AttentionList({ items, showProject = true, empty }: { items: AttentionItem[]; showProject?: boolean; empty: ReactNode }) {
  if (items.length === 0) return <div className="py-2">{empty}</div>;
  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <li key={item.id} className="border-t border-line first:border-t-0">
          <Link href={item.href} className="group row-hover -mx-3 flex items-start gap-3.5 rounded-md px-3 py-3.5">
            <span className={cn("mt-[7px] size-1.5 shrink-0 rounded-full", SEVERITY[item.severity].dot)} aria-label={`Prioridade ${SEVERITY[item.severity].label}`} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-body-sm font-medium text-fg-strong">{item.title}</span>
              <span className="text-body-sm text-fg-muted">
                {item.reason}
                {showProject && <span className="text-fg-subtle"> · {item.projectName}</span>}
              </span>
            </span>
            <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-fg-subtle opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function MilestoneAgenda({ items }: { items: { id: string; name: string; status: string; dueOn: string | null; projectId: string; projectName: string }[] }) {
  if (items.length === 0) return <p className="text-body-sm text-fg-subtle">Nenhum milestone em aberto.</p>;
  const today = dayKey(new Date());
  return (
    <ul className="flex flex-col gap-3.5">
      {items.map((m) => {
        const overdue = m.dueOn && m.dueOn < today;
        return (
          <li key={m.id}>
            <Link href={`/projects/${m.projectId}/roadmap#milestone-${m.id}`} className="group flex items-baseline gap-3">
              <span className={cn("font-numeric w-16 shrink-0 text-caption tracking-normal", overdue ? "text-danger" : "text-fg-subtle")}>{m.dueOn ? formatDate(m.dueOn).replace(/ de \d{4}$/, "") : "sem data"}</span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-body-sm text-fg-strong group-hover:text-accent">{m.name}</span>
                <span className="truncate text-caption tracking-normal text-fg-subtle">
                  {m.projectName}
                  {m.status === "active" && " · em andamento"}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function RecentEvents({ items }: { items: { id: string; projectId: string; projectName: string; title: string; label: string; origin: TimelineOrigin; occurredAt: Date }[] }) {
  if (items.length === 0) return <p className="text-body-sm text-fg-subtle">Nada registrado nos últimos 14 dias.</p>;
  return (
    <ol className="flex flex-col gap-3.5">
      {items.slice(0, 7).map((e) => (
        <li key={e.id} className="flex gap-3">
          <span className={cn("mt-[7px] size-1.5 shrink-0 rounded-full", ORIGIN_TONE[e.origin].dot)} aria-hidden />
          <Link href={`/projects/${e.projectId}/timeline`} className="group flex min-w-0 flex-col">
            <span className="line-clamp-1 text-body-sm text-fg group-hover:text-fg-strong">{e.title}</span>
            <span className="truncate text-caption tracking-normal text-fg-subtle" suppressHydrationWarning>
              {e.label} · {e.projectName} · {formatRelative(e.occurredAt)}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function ProjectRows({ items }: { items: { id: string; name: string; status: ProjectStatus; progress: number; summary: string | null; currentFocus: string | null; lastActivityAt: Date; commits30d: number }[] }) {
  return (
    <ul className="flex flex-col">
      {items.map((p) => (
        <li key={p.id} className="border-t border-line first:border-t-0">
          <Link href={`/projects/${p.id}`} className="group row-hover -mx-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 rounded-md px-3 py-4 sm:grid-cols-[minmax(0,1fr)_140px_90px]">
            <span className="flex min-w-0 flex-col gap-1">
              <span className="flex items-center gap-2.5">
                <StatusDot status={p.status} />
                <span className="truncate font-display text-h4 font-medium text-fg-strong">{p.name}</span>
              </span>
              <span className="line-clamp-1 pl-[18px] text-body-sm text-fg-muted">
                {p.currentFocus ? (
                  <>
                    <span className="text-fg-subtle">Foco · </span>
                    {p.currentFocus}
                  </>
                ) : (
                  (p.summary ?? <span className="text-fg-subtle">Sem descrição</span>)
                )}
              </span>
            </span>
            <span className="col-span-2 flex items-center gap-3 pl-[18px] sm:col-span-1 sm:pl-0">
              <span className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-surface-3/70">
                <span className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-700" style={{ width: `${p.progress}%` }} />
              </span>
              <span className="font-numeric w-9 text-right text-caption text-fg-muted">{p.progress}%</span>
            </span>
            <span className="hidden text-right text-caption tracking-normal text-fg-subtle sm:block" suppressHydrationWarning>
              {p.commits30d > 0 ? `${p.commits30d} commits` : formatRelative(p.lastActivityAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
