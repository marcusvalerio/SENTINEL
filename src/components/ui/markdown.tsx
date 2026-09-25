import { Fragment, type ReactNode } from "react";
import { parseMarkdown, type Inline } from "@/domain/markdown";
import { cn } from "@/lib/cn";

function renderInline(nodes: Inline[], onTag?: (tag: string) => ReactNode): ReactNode[] {
  return nodes.map((n, i) => {
    switch (n.t) {
      case "text":
        return <Fragment key={i}>{n.v}</Fragment>;
      case "strong":
        return (
          <strong key={i} className="font-semibold text-fg-strong">
            {renderInline(n.c, onTag)}
          </strong>
        );
      case "em":
        return <em key={i}>{renderInline(n.c, onTag)}</em>;
      case "code":
        return (
          <code key={i} className="rounded-xs bg-surface-3/70 px-1 py-px font-mono text-[0.85em] text-fg-strong">
            {n.v}
          </code>
        );
      case "link":
        return (
          <a key={i} href={n.href} target="_blank" rel="noreferrer noopener" className="text-accent underline decoration-accent/30 underline-offset-2 transition-colors hover:decoration-accent">
            {renderInline(n.c, onTag)}
          </a>
        );
      case "tag":
        return onTag ? <Fragment key={i}>{onTag(n.v)}</Fragment> : <span key={i} className="text-info">#{n.v}</span>;
    }
  });
}

/** Renders Rubrica Markdown as React elements (never as HTML strings). */
export function Markdown({ source, className, onTag }: { source: string; className?: string; onTag?: (tag: string) => ReactNode }) {
  const blocks = parseMarkdown(source);
  return (
    <div className={cn("flex max-w-[72ch] flex-col gap-3 text-body text-fg", className)}>
      {blocks.map((b, i) => {
        switch (b.t) {
          case "p":
            return (
              <p key={i} className="whitespace-pre-line">
                {renderInline(b.c, onTag)}
              </p>
            );
          case "h":
            return (
              <p key={i} className={cn("font-display font-medium text-fg-strong", b.level === 1 ? "text-h4" : "text-body")} role="heading" aria-level={b.level + 3}>
                {renderInline(b.c, onTag)}
              </p>
            );
          case "ul":
            return (
              <ul key={i} className="flex list-disc flex-col gap-1 pl-5 marker:text-fg-subtle">
                {b.items.map((item, j) => (
                  <li key={j}>{renderInline(item, onTag)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="flex list-decimal flex-col gap-1 pl-5 marker:font-mono marker:text-[0.8em] marker:text-fg-subtle">
                {b.items.map((item, j) => (
                  <li key={j}>{renderInline(item, onTag)}</li>
                ))}
              </ol>
            );
          case "quote":
            return (
              <blockquote key={i} className="border-l-2 border-line-3 pl-4 whitespace-pre-line text-fg-muted">
                {renderInline(b.c, onTag)}
              </blockquote>
            );
          case "pre":
            return (
              <pre key={i} className="overflow-x-auto rounded-md bg-sunken p-3 font-mono text-[0.8125rem] leading-relaxed text-fg shadow-[inset_0_0_0_1px_var(--color-line)]">
                {b.v}
              </pre>
            );
        }
      })}
    </div>
  );
}
