"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

/**
 * Entrance for page sections: a short rise with a small stagger via `delay`.
 * Runs once. Reduced motion keeps only the fade (MotionConfig).
 */
export function Reveal({ children, delay = 0, y = 8, className, ...props }: { children: ReactNode; delay?: number; y?: number; className?: string } & Omit<HTMLMotionProps<"div">, "children">) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Stagger container + item for lists that arrive together. */
export const staggerList = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035, delayChildren: 0.04 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};
