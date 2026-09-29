import { PROVENANCE_LABELS, type Provenance } from "@/domain/stack";
import { cn } from "@/lib/cn";

/**
 * How a piece of information is known. Detected = read from the source.
 * Inferred = SENTINEL's conclusion (dashed, never presented as fact).
 * Informed = said by the person.
 */
export function ProvenanceTag({ value, className, title }: { value: Provenance; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[0.625rem] font-medium tracking-[0.04em] uppercase",
        value === "detected" && "bg-[rgb(134_185_156/0.1)] text-success",
        value === "inferred" && "text-warning shadow-[inset_0_0_0_1px_rgb(215_177_107/0.45)] [background-image:repeating-linear-gradient(135deg,transparent_0_4px,rgb(215_177_107/0.06)_4px_5px)]",
        value === "user" && "bg-surface-2 text-fg-muted",
        className,
      )}
    >
      {PROVENANCE_LABELS[value]}
    </span>
  );
}
