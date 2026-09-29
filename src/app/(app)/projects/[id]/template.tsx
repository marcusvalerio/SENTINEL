"use client";

import { motion } from "motion/react";

/** Section content settles in when switching sections; the project header stays still. */
export default function SectionTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}
