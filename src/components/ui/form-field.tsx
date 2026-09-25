"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, useContext, useId, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

type FieldContextValue = { id: string; hintId: string; errorId: string; invalid: boolean; describedBy?: string };
const FieldContext = createContext<FieldContextValue | null>(null);

/** Controls read their id / aria wiring from the nearest FormField. */
export function useField() {
  return useContext(FieldContext);
}

type FormFieldProps = {
  label: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  optional?: boolean;
  /** Renders the label as a larger question — used for discovery prompts. */
  prompt?: boolean;
  counter?: { value: number; max: number };
  className?: string;
  id?: string;
};

export function FormField({
  label,
  children,
  hint,
  error,
  required,
  optional,
  prompt = false,
  counter,
  className,
  id: providedId,
}: FormFieldProps) {
  const generated = useId();
  const id = providedId ?? generated;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const invalid = Boolean(error);
  const describedBy = [hint ? hintId : null, invalid ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ id, hintId, errorId, invalid, describedBy }}>
      <div className={cn("flex flex-col", prompt ? "gap-2.5" : "gap-1.5", className)}>
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor={id}
            className={cn(
              prompt
                ? "font-display text-h4 font-medium text-fg-strong sm:text-[1.0625rem]"
                : "text-label font-medium text-fg",
            )}
          >
            {label}
            {required && (
              <span className="ml-1 text-accent" aria-hidden>
                *
              </span>
            )}
            {required && <span className="sr-only"> (obrigatório)</span>}
          </label>
          {optional && !required && <span className="eyebrow shrink-0 normal-case tracking-normal">Opcional</span>}
          {counter && (
            <span
              className={cn(
                "font-numeric shrink-0 text-caption tracking-normal",
                counter.value > counter.max ? "text-danger" : "text-fg-subtle",
              )}
              aria-live="polite"
            >
              {counter.value}/{counter.max}
            </span>
          )}
        </div>
        {hint && (
          <p id={hintId} className={cn("text-body-sm text-fg-muted", prompt ? "-mt-1" : "order-last")}>
            {hint}
          </p>
        )}
        {children}
        <AnimatePresence initial={false}>
          {invalid && (
            <motion.p
              id={errorId}
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
              className="flex items-center gap-1.5 overflow-hidden text-body-sm text-danger"
            >
              <CircleAlert className="size-3.5 shrink-0" aria-hidden />
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </FieldContext.Provider>
  );
}
