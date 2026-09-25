import type { Transition, Variants } from "motion/react";

/**
 * Motion tokens. Durations are short on purpose: motion explains a change,
 * it never makes the user wait for it.
 */
export const duration = {
  instant: 0.1,
  fast: 0.16,
  base: 0.22,
  slow: 0.32,
  deliberate: 0.48,
} as const;

export const ease = {
  out: [0.25, 1, 0.5, 1],
  outExpo: [0.16, 1, 0.3, 1],
  inOut: [0.37, 0, 0.63, 1],
} as const;

export const transition = {
  fast: { duration: duration.fast, ease: ease.out },
  base: { duration: duration.base, ease: ease.out },
  slow: { duration: duration.slow, ease: ease.outExpo },
  spring: { type: "spring", stiffness: 520, damping: 38, mass: 0.8 },
  layout: { type: "spring", stiffness: 420, damping: 36 },
} satisfies Record<string, Transition>;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: transition.base },
  exit: { opacity: 0, y: -4, transition: transition.fast },
};

export const stagger = (step = 0.035, delay = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: step, delayChildren: delay } },
});
