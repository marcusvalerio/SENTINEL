"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import type { Route } from "next";
import { cn } from "@/lib/cn";

export type TabItem = { href: string; label: string; active: boolean; count?: number; icon?: ReactNode };

/**
 * Route-driven tabs. Each tab is a real link (shareable URL, back button,
 * prefetch) and the indicator glides between them with a shared layout id.
 */
export function TabNav({ items, id, label, variant = "underline", className }: { items: TabItem[]; id: string; label: string; variant?: "underline" | "segmented"; className?: string }) {
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the active tab visible in horizontally scrolling (mobile) tab bars.
  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [items]);

  if (variant === "segmented") {
    return (
      <nav aria-label={label} className={cn("-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
        <div ref={listRef} className="inline-flex min-w-max items-center gap-0.5 rounded-md bg-sunken p-0.5 shadow-[inset_0_0_0_1px_var(--color-line)]">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href as Route}
              scroll={false}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "relative flex h-8 items-center gap-2 rounded-sm px-3 text-body-sm transition-colors duration-150",
                item.active ? "text-fg-strong" : "text-fg-muted hover:text-fg-strong",
              )}
            >
              {item.active && (
                <motion.span
                  layoutId={`${id}-indicator`}
                  className="absolute inset-0 rounded-sm bg-surface-3 shadow-[inset_0_0_0_1px_var(--color-line-2),0_1px_2px_rgb(0_0_0/0.3)]"
                  transition={{ type: "spring", stiffness: 520, damping: 40 }}
                />
              )}
              <span className="relative">{item.label}</span>
              {item.count !== undefined && (
                <span className={cn("font-numeric relative text-caption tracking-normal", item.active ? "text-accent" : "text-fg-subtle")}>{item.count}</span>
              )}
            </Link>
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label={label} className={cn("relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none]", className)}>
      <div ref={listRef} className="flex min-w-max items-center gap-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href as Route}
            scroll={false}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "group relative flex h-11 items-center gap-2 px-2.5 text-body-sm transition-colors duration-150 [&_svg]:size-3.5",
              item.active ? "text-fg-strong" : "text-fg-muted hover:text-fg-strong",
            )}
          >
            <span className="absolute inset-x-0 inset-y-1.5 rounded-sm transition-colors group-hover:bg-surface-2/70" aria-hidden />
            {item.icon && <span className={cn("relative", item.active ? "text-accent" : "text-fg-subtle")}>{item.icon}</span>}
            <span className="relative">{item.label}</span>
            {item.count !== undefined && item.count > 0 && <span className="font-numeric relative text-caption tracking-normal text-fg-subtle">{item.count}</span>}
            {item.active && (
              <motion.span
                layoutId={`${id}-underline`}
                className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-accent"
                transition={{ type: "spring", stiffness: 520, damping: 42 }}
              />
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
