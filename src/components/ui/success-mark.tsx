"use client";

import { motion } from "motion/react";

/** A check that draws itself — the "done" state shared by buttons and toasts. */
export function SuccessMark({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <motion.path
        d="M3.5 8.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}
