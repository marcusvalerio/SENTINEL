"use client";

import { AnimatePresence, motion } from "motion/react";
import { CornerDownLeft, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { Kbd } from "./badge";
import { Spinner } from "./spinner";

export type CommandItem = {
  id: string;
  label: string;
  group: string;
  icon?: ReactNode;
  hint?: ReactNode;
  description?: ReactNode;
  keywords?: string;
  onSelect: () => void;
};

export type RemoteGroup = { group: string; count: number; items: CommandItem[] };

function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/**
 * ⌘K palette. Local commands filter instantly; `onQueryChange` lets the host
 * stream remote results (global search) in beneath them, grouped with counts.
 */
export function CommandMenu({
  open,
  onClose,
  items,
  remote = [],
  loading = false,
  onQueryChange,
  placeholder = "Buscar projetos, Rubrica, timeline, atividade…",
  footer,
}: {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
  remote?: RemoteGroup[];
  loading?: boolean;
  onQueryChange?: (query: string) => void;
  placeholder?: string;
  footer?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const groups = useMemo(() => {
    const q = normalize(query.trim());
    const local = q ? items.filter((item) => normalize(`${item.label} ${item.keywords ?? ""} ${item.group}`).includes(q)) : items;
    const map = new Map<string, { count?: number; items: CommandItem[] }>();
    for (const item of local) map.set(item.group, { items: [...(map.get(item.group)?.items ?? []), item] });
    for (const g of remote) map.set(g.group, { count: g.count, items: g.items });
    return Array.from(map.entries());
  }, [items, remote, query]);

  const flat = useMemo(() => groups.flatMap(([, g]) => g.items), [groups]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      setQuery("");
      setActive(0);
      onQueryChange?.("");
      inputRef.current?.focus();
    });
    const previous = document.activeElement as HTMLElement | null;
    return () => {
      cancelAnimationFrame(frame);
      previous?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setActive((i) => (flat.length ? (i + 1) % flat.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      run(flat[Math.min(active, flat.length - 1)]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  if (typeof document === "undefined") return null;
  let index = -1;
  const activeItem = flat[active];

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center px-3 pt-[8vh] sm:px-4 sm:pt-[12vh]">
          <motion.div className="absolute inset-0 bg-[rgb(10_11_14/0.7)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }} onClick={onClose} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Busca e comandos"
            initial={{ opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99, transition: { duration: 0.1 } }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-surface shadow-overlay"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              {loading ? <Spinner className="size-4 shrink-0 text-fg-subtle" /> : <Search className="size-4 shrink-0 text-fg-subtle" aria-hidden />}
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                  onQueryChange?.(event.target.value);
                }}
                placeholder={placeholder}
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={activeItem ? `${listId}-${activeItem.id}` : undefined}
                aria-autocomplete="list"
                className="h-13 min-w-0 flex-1 bg-transparent text-body text-fg-strong outline-none placeholder:text-fg-subtle focus-visible:shadow-none max-sm:text-base"
              />
              <Kbd>esc</Kbd>
            </div>
            <div ref={listRef} id={listId} role="listbox" className="max-h-[min(480px,62dvh)] overflow-y-auto p-1.5">
              {flat.length === 0 && (
                <p className="px-3 py-10 text-center text-body-sm text-fg-muted">{loading ? "Buscando na memória dos projetos…" : query.trim() ? `Nada encontrado para “${query}”.` : "Digite para buscar."}</p>
              )}
              {groups.map(([group, g]) => (
                <div key={group} role="group" aria-label={group} className="pb-1">
                  <div className="eyebrow flex items-center justify-between px-2.5 pt-2.5 pb-1.5">
                    <span>{group}</span>
                    {g.count !== undefined && <span className="font-numeric text-fg-subtle">{g.count > g.items.length ? `${g.items.length} de ${g.count}` : g.count}</span>}
                  </div>
                  {g.items.map((item) => {
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
                        className={cn("relative flex min-h-10 cursor-pointer items-center gap-3 rounded-sm px-2.5 py-2 text-body-sm [&_svg]:size-4", selected ? "bg-surface-3 text-fg-strong" : "text-fg")}
                      >
                        {selected && <span className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-accent" aria-hidden />}
                        {item.icon && <span className={cn("shrink-0", selected ? "text-accent" : "text-fg-subtle")}>{item.icon}</span>}
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate">{item.label}</span>
                          {item.description && <span className="truncate text-caption tracking-normal text-fg-subtle">{item.description}</span>}
                        </span>
                        {item.hint}
                        {selected && <CornerDownLeft className="size-3.5! shrink-0 text-fg-subtle" aria-hidden />}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            {footer && <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-caption tracking-normal text-fg-subtle">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
