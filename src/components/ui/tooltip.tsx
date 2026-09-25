"use client";

import { AnimatePresence, motion } from "motion/react";
import { cloneElement, isValidElement, useId, useRef, useState, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type TooltipProps = {
  content: ReactNode;
  children: ReactElement<Record<string, unknown>>;
  side?: "top" | "bottom";
  shortcut?: string;
};

/**
 * Lightweight tooltip: appears on hover (after a short intent delay) and on
 * keyboard focus, is announced via aria-describedby, and never traps focus.
 */
export function Tooltip({ content, children, side = "top", shortcut }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const id = useId();

  const show = (delay: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setOpen(false);
  };

  if (!isValidElement(children)) return children;

  return (
    <span
      className="relative inline-flex"
      onPointerEnter={() => show(350)}
      onPointerLeave={hide}
      onFocus={() => show(0)}
      onBlur={hide}
      onKeyDown={(event) => event.key === "Escape" && hide()}
    >
      {cloneElement(children, { "aria-describedby": open ? id : undefined })}
      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, y: side === "top" ? 3 : -3, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            transition={{ duration: 0.14, ease: [0.25, 1, 0.5, 1] }}
            className={cn(
              "pointer-events-none absolute left-1/2 z-[var(--z-tooltip)] -translate-x-1/2 whitespace-nowrap",
              "flex items-center gap-2 rounded-sm bg-surface-3 px-2 py-1 text-caption tracking-normal text-fg-strong shadow-overlay",
              side === "top" ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]",
            )}
          >
            {content}
            {shortcut && <kbd className="font-mono text-[10px] text-fg-subtle">{shortcut}</kbd>}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
