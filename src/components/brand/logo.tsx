import { cn } from "@/lib/cn";

/**
 * SENTINEL mark: an aperture that watches. The outer ring is memory (the
 * archive), the inner ring the present, the gold arc the watch that sweeps
 * across both. Deliberately geometric and quiet.
 */
export function LogoMark({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-6", className)} aria-hidden>
      <circle cx="12" cy="12" r="10.25" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5" />
      <g className={animated ? "origin-center animate-[spin_9s_linear_infinite]" : undefined}>
        <path d="M12 1.75A10.25 10.25 0 0 1 22.25 12" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      <circle cx="12" cy="12" r="5.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.75" fill="var(--color-wine)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-fg-strong", className)}>
      <LogoMark />
      <span className="font-display text-[0.8125rem] font-semibold tracking-[0.28em]">SENTINEL</span>
    </span>
  );
}
