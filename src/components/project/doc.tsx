import Link from "next/link";
import type { Route } from "next";
import { PencilLine } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Reading layout for registered knowledge — a document, not a form. */
export function DocSection({ title, children, editHref, description, className }: { title: string; children: ReactNode; editHref?: string; description?: string; className?: string }) {
  return (
    <section className={cn("grid gap-4 border-t border-line pt-7 first:border-t-0 first:pt-0 md:grid-cols-[200px_minmax(0,1fr)] md:gap-10", className)}>
      <div className="flex items-start justify-between gap-3 md:flex-col">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-h4 font-medium text-fg-strong">{title}</h2>
          {description && <p className="text-body-sm text-fg-subtle">{description}</p>}
        </div>
        {editHref && (
          <Link href={editHref as Route} className="flex h-7 items-center gap-1.5 rounded-xs px-1.5 text-caption tracking-normal text-fg-muted transition-colors hover:bg-surface-2 hover:text-accent md:-ml-1.5">
            <PencilLine className="size-3.5" aria-hidden />
            Editar
          </Link>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
    </section>
  );
}

export function DocField({ label, value, emphasis = false, fallback = "Não registrado" }: { label: string; value: ReactNode | string | null | undefined; emphasis?: boolean; fallback?: string }) {
  const empty = value === null || value === undefined || (typeof value === "string" && value.trim() === "");
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="eyebrow">{label}</h3>
      {empty ? (
        <p className="text-body-sm text-fg-subtle italic">{fallback}</p>
      ) : typeof value === "string" ? (
        <p className={cn("max-w-[72ch] whitespace-pre-line", emphasis ? "font-display text-h3 leading-snug font-normal text-fg-strong" : "text-body text-fg")}>{value}</p>
      ) : (
        value
      )}
    </div>
  );
}

export function DetailList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="flex flex-col divide-y divide-line">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
          <dt className="shrink-0 text-body-sm text-fg-subtle">{item.label}</dt>
          <dd className="min-w-0 truncate text-right text-body-sm text-fg">{item.value ?? <span className="text-fg-subtle">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
