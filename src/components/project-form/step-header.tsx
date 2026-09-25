import type { ReactNode } from "react";

/** The question that frames a step. Titles are statements of intent, not labels. */
export function StepHeader({ counter, title, description }: { counter: string; title: string; description: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 pb-2">
      <span className="eyebrow flex items-center gap-3 text-accent/90">
        <span>{counter}</span>
        <span className="h-px w-8 bg-accent/30" aria-hidden />
      </span>
      <h1 className="font-display text-h2 font-medium tracking-[-0.025em] text-fg-strong sm:text-h1">{title}</h1>
      <p className="max-w-[58ch] text-body text-fg-muted">{description}</p>
    </header>
  );
}

/** Groups related questions inside a step with a quiet hairline label. */
export function FieldGroup({ title, children, aside }: { title?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="flex flex-col gap-6 border-t border-line pt-7">
      {title && (
        <div className="-mb-1 flex items-center justify-between gap-3">
          <h2 className="eyebrow">{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
