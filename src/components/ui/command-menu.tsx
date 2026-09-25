"use client";

import { AnimatePresence, motion } from "motion/react";
import { CornerDownLeft, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { Kbd } from "./badge";

export type CommandItem = {
  id: string;
  label: string;
  group: string;
  icon?: ReactNode;
  hint?: ReactNode;
  keywords?: string;
  onSelect: () => void;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** ⌘K palette: type to filter, arrows to move, Enter to run. */
export function CommandMenu({ open, onClose, items, placeholder = "Buscar projetos e ações…" }: { open: boolean; onClose: () => void; items: CommandItem[]; placeholder?: string }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return items;
    return items.filter((item) => normalize(`${item.label} ${item.keywords ?? ""} ${item.group}`).includes(q));
  }, [items, query]);

  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of filtered) map.set(item.group, [...(map.get(item.group) ?? []), item]);
    return Array.from(map.entries());
  }, [filtered]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      setQuery("");
      setActive(0);
      inputRef.current?.focus();
    });
    const previous = document.activeElement as HTMLElement | null;
    return () => {
      cancelAnimationFrame(frame);
      previous?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const run = (item: CommandItem | undefined) => {
    if (!item) return;
    onClose();
    item.onSelect();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (filtered.length ? (i + 1) % filtered.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      run(filtered[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  if (typeof document === "undefined") return null;
  let index = -1;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            className="absolute inset-0 bg-[rgb(10_11_14/0.7)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Menu de comandos"
            initial={{ opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99, transition: { duration: 0.1 } }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-xl overflow-hidden rounded-lg bg-surface shadow-overlay"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="size-4 shrink-0 text-fg-subtle" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                placeholder={placeholder}
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={filtered[active] ? `${listId}-${filtered[active]!.id}` : undefined}
                aria-autocomplete="list"
                className="h-13 flex-1 bg-transparent text-body text-fg-strong outline-none placeholder:text-fg-subtle focus-visible:shadow-none max-sm:text-base"
              />
              <Kbd>esc</Kbd>
            </div>
            <div ref={listRef} id={listId} role="listbox" className="max-h-[min(420px,60dvh)] overflow-y-auto p-1.5">
              {filtered.length === 0 && (
                <p className="px-3 py-10 text-center text-body-sm text-fg-muted">Nada encontrado para “{query}”.</p>
              )}
              {groups.map(([group, groupItems]) => (
                <div key={group} role="group" aria-label={group} className="pb-1">
                  <div className="eyebrow px-2.5 pt-2.5 pb-1.5">{group}</div>
                  {groupItems.map((item) => {
                    index += 1;
                    const current = index;
                    const selected = current === active;
                    return (
                      <div
                        key={item.id}
                        id={`${listId}-${item.id}`}
                        role="option"
                        aria-selected={selected}
                        data-index={current}
                        onPointerMove={() => setActive(current)}
                        onClick={() => run(item)}
                        className={cn(
                          "relative flex h-10 cursor-pointer items-center gap-3 rounded-sm px-2.5 text-body-sm [&_svg]:size-4",
                          selected ? "bg-surface-3 text-fg-strong" : "text-fg",
                        )}
                      >
                        {selected && <span className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-accent" aria-hidden />}
                        {item.icon && <span className={cn("shrink-0", selected ? "text-accent" : "text-fg-subtle")}>{item.icon}</span>}
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.hint}
                        {selected && <CornerDownLeft className="size-3.5! text-fg-subtle" aria-hidden />}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
