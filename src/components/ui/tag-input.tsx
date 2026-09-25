"use client";

import { AnimatePresence, motion } from "motion/react";
import { Hash, X } from "lucide-react";
import { useId, useState } from "react";
import { normalizeTag } from "@/domain/tags";
import { cn } from "@/lib/cn";

/** Fast tag entry: Enter, comma or space commits; Backspace on empty removes the last tag. */
export function TagInput({ value, onChange, suggestions = [], label = "Tags" }: { value: string[]; onChange: (tags: string[]) => void; suggestions?: string[]; label?: string }) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const id = useId();

  const add = (raw: string) => {
    const tag = normalizeTag(raw);
    if (tag && !value.includes(tag) && value.length < 20) onChange([...value, tag]);
    setDraft("");
  };

  const available = suggestions.filter((s) => !value.includes(s) && (!draft || s.startsWith(normalizeTag(draft)))).slice(0, 8);

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "flex min-h-10 flex-wrap items-center gap-1.5 rounded-md bg-sunken/70 px-2 py-1.5 shadow-[inset_0_0_0_1px_var(--color-line-2)] transition-shadow",
          focused && "shadow-[inset_0_0_0_1px_rgb(215_196_133/0.6),0_0_0_3px_rgb(215_196_133/0.1)]",
        )}
      >
        <Hash className="ml-1 size-3.5 shrink-0 text-fg-subtle" aria-hidden />
        <AnimatePresence initial={false}>
          {value.map((tag) => (
            <motion.span key={tag} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex h-6 items-center gap-1 rounded-xs bg-identity pr-0.5 pl-2 text-caption tracking-normal text-[#b8c5ea]">
              #{tag}
              <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} aria-label={`Remover tag ${tag}`} className="flex size-5 items-center justify-center rounded-xs text-fg-subtle hover:text-fg-strong">
                <X className="size-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          id={id}
          value={draft}
          aria-label={label}
          onChange={(e) => {
            const v = e.target.value;
            if (/[,\s]$/.test(v)) add(v.slice(0, -1));
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              e.stopPropagation();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (draft.trim()) add(draft);
          }}
          placeholder={value.length ? "" : "produto, ux, backend…"}
          className="min-w-24 flex-1 bg-transparent px-1 text-body-sm text-fg-strong outline-none placeholder:text-fg-subtle/80 focus-visible:shadow-none max-sm:text-base"
        />
      </div>
      {available.length > 0 && (
        <div className="flex flex-wrap gap-1" aria-label="Sugestões de tags">
          {available.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="h-6 rounded-xs px-1.5 text-caption tracking-normal text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg">
              #{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
