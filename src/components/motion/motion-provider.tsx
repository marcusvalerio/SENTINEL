"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * One place that defines how SENTINEL moves.
 * - reducedMotion="user": honours prefers-reduced-motion for every motion
 *   component (transforms are dropped, opacity is kept so state still reads).
 * - A single default transition keeps unspecified animations in family.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.9 }}>
      {children}
    </MotionConfig>
  );
}
