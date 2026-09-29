"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

type AnimatedNumberProps = {
  value: number;
  format?: (n: number) => string;
  className?: string;
  /** Seconds. Short: numbers settle, they don't perform. */
  duration?: number;
};

/**
 * A number that counts to its new value when it changes or first comes into
 * view. Writes straight to the DOM (no re-render per frame). Screen readers
 * get the final value only.
 */
export function AnimatedNumber({ value, format = (n) => String(Math.round(n)), className, duration = 0.9 }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef<number | null>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    const from = previous.current ?? 0;
    previous.current = value;
    if (reduce || from === value) {
      el.textContent = format(value);
      return;
    }
    const controls = animate(from, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        el.textContent = format(latest);
      },
    });
    return () => controls.stop();
  }, [value, inView, reduce, duration, format]);

  return (
    <span className={className}>
      <span ref={ref} aria-hidden>
        {format(value)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
