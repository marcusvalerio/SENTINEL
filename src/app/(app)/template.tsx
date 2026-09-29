"use client";

import { motion } from "motion/react";

/**
 * Page transition. `template` re-mounts on every navigation inside the app
 * shell, so each page settles in with a short fade/rise — never a slide
 * that makes the user wait.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div className="flex flex-1 flex-col" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}
