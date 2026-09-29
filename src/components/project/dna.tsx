import Link from "next/link";
import type { ReactNode } from "react";
import { GithubMark } from "@/components/brand/github-mark";
import { ProvenanceTag } from "@/components/ui/provenance";
import type { HealthSignal, SignalState } from "@/domain/health";
import { STACK_CATEGORY_LABELS, type StackItem } from "@/domain/stack";
import { cn } from "@/lib/cn";

const STATE: Record<SignalState, { dot: string; text: string; label: string }> = {
  good: { dot: "bg-success", text: "text-fg-strong", label: "Bom" },
  watch: { dot: "bg-warning", text: "text-fg-strong", label: "Observar" },
  risk: { dot: "bg-danger", text: "text-danger", label: "Risco" },
  none: { dot: "bg-transparent shadow-[inset_0_0_0_1px_var(--color-fg-subtle)]", text: "text-fg-muted", label: "Sem dados" },
};

/** Four explainable signals. Each shows its reason — never a score. */
export function HealthSignals({ signals }: { signals: HealthSignal[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
      {signals.map((s) => (
        <div key={s.key} className="flex min-w-0 flex-col gap-1" title={s.reason}>
          <dt className="text-caption tracking-normal text-fg-subtle">{s.label}</dt>
          <dd className="flex min-w-0 flex-col gap-0.5">
            <span className={cn("flex items-center gap-2 text-body-sm font-medium", STATE[s.state].text)}>
              <span className={cn("size-1.5 shrink-0 rounded-full", STATE[s.state].dot)} aria-label={STATE[s.state].label} />
              {s.value}
            </span>
            <span className="line-clamp-2 text-caption tracking-normal text-fg-subtle">{s.reason}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A labelled block in the open aside: hairline on top, no box. */
export function AsideBlock({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-line pt-5 first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="eyebrow">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StackList({ stack }: { stack: StackItem[] }) {
  if (stack.length === 0) return <p className="text-body-sm text-fg-subtle">Nenhuma tecnologia registrada.</p>;
  return (
    <ul className="flex flex-col">
      {stack.slice(0, 10).map((item) => (
        <li key={`${item.category}:${item.name}`} className="flex items-center justify-between gap-3 py-1.5" title={item.evidence}>
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-body-sm text-fg">{item.name}</span>
            <span className="truncate text-caption tracking-normal text-fg-subtle">{STACK_CATEGORY_LABELS[item.category]}</span>
          </span>
          <ProvenanceTag value={item.provenance} title={item.evidence} />
        </li>
      ))}
      {stack.length > 10 && <li className="pt-1.5 text-caption tracking-normal text-fg-subtle">+{stack.length - 10} outras</li>}
    </ul>
  );
}

export function RepositoryLine({ owner, name, href }: { owner: string; name: string; href: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2 text-body-sm text-fg transition-colors hover:text-accent">
      <GithubMark className="size-3.5 text-fg-muted group-hover:text-accent" />
      <span className="truncate font-mono text-[0.8125rem]">
        {owner}/{name}
      </span>
    </Link>
  );
}
