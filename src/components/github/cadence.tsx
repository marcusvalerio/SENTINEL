"use client";

import { motion } from "motion/react";
import { formatDate } from "@/lib/format";

/** 30 days of commits as a quiet bar strip. Activity, not progress. */
export function CommitCadence({ days, label = "Commits nos últimos 30 dias" }: { days: { day: string; count: number }[]; label?: string }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((s, d) => s + d.count, 0);
  return (
    <figure className="flex flex-col gap-2" aria-label={`${label}: ${total}`}>
      <div className="flex h-12 items-end gap-[3px]" role="img" aria-label={`${total} commits em 30 dias`}>
        {days.map((d, i) => (
          <motion.span
            key={d.day}
            title={`${formatDate(d.day)} · ${d.count} ${d.count === 1 ? "commit" : "commits"}`}
            className={d.count ? "flex-1 rounded-[2px] bg-[#7fb0e8]/80" : "flex-1 rounded-[2px] bg-surface-3/70"}
            initial={{ height: 2 }}
            animate={{ height: d.count ? Math.max(4, (d.count / max) * 48) : 2 }}
            transition={{ duration: 0.5, delay: i * 0.012, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </div>
      <figcaption className="flex justify-between text-caption tracking-normal text-fg-subtle">
        <span>{formatDate(days[0]?.day)}</span>
        <span>hoje</span>
      </figcaption>
    </figure>
  );
}
