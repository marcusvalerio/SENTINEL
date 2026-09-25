"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DropdownItem =
  | {
      type?: "item";
      label: string;
      icon?: ReactNode;
      onSelect: () => void;
      tone?: "default" | "danger";
      selected?: boolean;
      disabled?: boolean;
      hint?: ReactNode;
    }
  | { type: "separator" }
  | { type: "label"; label: string };

type DropdownProps = {
  trigger: (props: { open: boolean; ref: (el: HTMLButtonElement | null) => void; toggle: () => void; "aria-expanded": boolean; "aria-haspopup": "menu"; "aria-controls": string; onKeyDown: (e: React.KeyboardEvent) => void }) => ReactNode;
  items: DropdownItem[];
  align?: "start" | "end";
  width?: number;
};

/** Accessible menu button: arrow keys, Home/End, Escape, click-outside. */
export function Dropdown({ trigger, items, align = "end", width = 220 }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const [triggerEl, setTriggerEl] = useState<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const itemNodes = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])') ?? []);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerEl?.focus();
  }, [triggerEl]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => itemNodes()[0]?.focus());
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerEl?.contains(target)) close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, close, triggerEl]);

  const onMenuKeyDown = (event: React.KeyboardEvent) => {
    const nodes = itemNodes();
    const index = nodes.indexOf(document.activeElement as HTMLElement);
    const focus = (i: number) => nodes[(i + nodes.length) % nodes.length]?.focus();
    const keys: Record<string, () => void> = {
      ArrowDown: () => focus(index + 1),
      ArrowUp: () => focus(index - 1),
      Home: () => focus(0),
      End: () => focus(nodes.length - 1),
      Escape: () => close(),
    };
    if (event.key === "Tab") close(false);
    else if (keys[event.key]) {
      event.preventDefault();
      keys[event.key]!();
    }
  };

  return (
    <div className="relative inline-flex">
      {trigger({
        open,
        ref: setTriggerEl,
        toggle: () => setOpen((v) => !v),
        "aria-expanded": open,
        "aria-haspopup": "menu",
        "aria-controls": menuId,
        onKeyDown: (event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        },
      })}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            id={menuId}
            role="menu"
            onKeyDown={onMenuKeyDown}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -2, transition: { duration: 0.1 } }}
            transition={{ duration: 0.16, ease: [0.25, 1, 0.5, 1] }}
            style={{ width, transformOrigin: align === "end" ? "top right" : "top left" }}
            className={cn(
              "absolute top-[calc(100%+6px)] z-[var(--z-dropdown)] flex flex-col rounded-md bg-surface-2 p-1 shadow-overlay",
              align === "end" ? "right-0" : "left-0",
            )}
          >
            {items.map((item, i) => {
              if (item.type === "separator") return <div key={`sep-${i}`} role="separator" className="my-1 h-px bg-line" />;
              if (item.type === "label")
                return (
                  <div key={`label-${i}`} className="eyebrow px-2 pt-1.5 pb-1">
                    {item.label}
                  </div>
                );
              return (
                <button
                  key={item.label}
                  type="button"
                  role={item.selected !== undefined ? "menuitemradio" : "menuitem"}
                  aria-checked={item.selected}
                  aria-disabled={item.disabled || undefined}
                  tabIndex={-1}
                  onClick={() => {
                    if (item.disabled) return;
                    close();
                    item.onSelect();
                  }}
                  className={cn(
                    "flex h-8 items-center gap-2.5 rounded-sm px-2 text-left text-body-sm outline-none transition-colors",
                    "focus:bg-surface-3 hover:bg-surface-3 [&_svg]:size-4 [&_svg]:shrink-0",
                    item.tone === "danger" ? "text-danger" : "text-fg",
                    item.disabled && "opacity-40",
                  )}
                >
                  {item.icon && <span className={cn(item.tone === "danger" ? "text-danger" : "text-fg-subtle")}>{item.icon}</span>}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.hint}
                  {item.selected && <Check className="text-accent" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
