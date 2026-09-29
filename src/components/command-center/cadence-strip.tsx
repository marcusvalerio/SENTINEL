"use client";

import { motion } from "motion/react";

/** Aggregate commit cadence across every project — activity, never progress. */
export function CadenceStrip({ days }: { days: { day: string; count: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div className="flex h-10 items-end gap-[3px]" role="img" aria-label={`${days.reduce((s, d) => s + d.count, 0)} commits em 30 dias`}>
      {days.map((d, i) => (
        <motion.span
          key={d.day}
          title={`${d.day.split("-").reverse().join("/")} · ${d.count}`}
          className={d.count ? "flex-1 rounded-[1.5px] bg-[#7fb0e8]/75" : "flex-1 rounded-[1.5px] bg-surface-3/60"}
          initial={{ height: 2 }}
          animate={{ height: d.count ? Math.max(4, (d.count / max) * 40) : 2 }}
          transition={{ duration: 0.6, delay: 0.2 + i * 0.012, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </div>
  );
}
