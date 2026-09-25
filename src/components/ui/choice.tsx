"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useField } from "./form-field";

/* ---------------------------------------------------------------- Checkbox */

type CheckboxProps = Omit<ComponentProps<"input">, "type"> & { label?: ReactNode; description?: ReactNode };

export function Checkbox({ label, description, className, id, checked, ...props }: CheckboxProps) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <label htmlFor={inputId} className={cn("group flex cursor-pointer items-start gap-3", className)}>
      <span className="relative mt-0.5 flex size-4 shrink-0 items-center justify-center">
        <input id={inputId} type="checkbox" checked={checked} className="peer absolute inset-0 cursor-pointer appearance-none rounded-xs bg-sunken shadow-[inset_0_0_0_1px_var(--color-line-3)] transition-colors checked:bg-accent checked:shadow-none focus-visible:shadow-focus" {...props} />
        <Check className="pointer-events-none relative size-3 scale-50 stroke-[3] text-fg-on-accent opacity-0 transition-[opacity,transform] duration-150 peer-checked:scale-100 peer-checked:opacity-100" aria-hidden />
      </span>
      {(label || description) && (
        <span className="flex flex-col gap-0.5">
          {label && <span className="text-body-sm text-fg-strong">{label}</span>}
          {description && <span className="text-body-sm text-fg-muted">{description}</span>}
        </span>
      )}
    </label>
  );
}

/* ------------------------------------------------------------------ Switch */

type SwitchProps = { checked: boolean; onCheckedChange: (value: boolean) => void; label: ReactNode; description?: ReactNode; id?: string; disabled?: boolean };

export function Switch({ checked, onCheckedChange, label, description, id, disabled }: SwitchProps) {
  const generated = useId();
  const switchId = id ?? generated;
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={switchId} className="flex cursor-pointer flex-col gap-0.5">
        <span className="text-body-sm text-fg-strong">{label}</span>
        {description && <span className="text-body-sm text-fg-muted">{description}</span>}
      </label>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200",
          checked ? "bg-accent" : "bg-surface-3 shadow-[inset_0_0_0_1px_var(--color-line-2)]",
          "disabled:opacity-50",
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 700, damping: 40 }}
          className={cn("size-4 rounded-full shadow-sm", checked ? "ml-auto bg-canvas" : "bg-fg-muted")}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------ ChoiceGroup */

export type ChoiceOption<T extends string> = { value: T; label: string; description?: string; icon?: ReactNode; tone?: string };

type ChoiceGroupProps<T extends string> = {
  options: readonly ChoiceOption<T>[];
  value: T | null | undefined;
  onChange: (value: T | null) => void;
  name?: string;
  columns?: 2 | 3 | 4;
  /** Allow clicking the selected option again to clear it (for optional answers). */
  clearable?: boolean;
  size?: "sm" | "md";
  "aria-label"?: string;
};

/**
 * Radio group rendered as selectable tiles. Real radio inputs underneath, so
 * arrow-key navigation, form semantics and screen readers work natively.
 */
export function ChoiceGroup<T extends string>({
  options,
  value,
  onChange,
  name,
  columns = 3,
  clearable = false,
  size = "md",
  "aria-label": ariaLabel,
}: ChoiceGroupProps<T>) {
  const field = useField();
  const generated = useId();
  const groupName = name ?? generated;
  const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[columns];

  return (
    <div
      role="radiogroup"
      id={field?.id}
      aria-label={ariaLabel}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      className={cn("grid gap-1.5", size === "sm" ? "grid-cols-3" : "grid-cols-2", cols)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "group relative flex cursor-pointer items-center gap-2.5 rounded-md text-left transition-[background-color,box-shadow,color] duration-150",
              size === "sm" ? "min-h-10 px-3 py-2" : "min-h-11 px-3 py-2.5",
              selected
                ? "bg-identity text-fg-strong shadow-[inset_0_0_0_1px_rgb(215_196_133/0.45)]"
                : "bg-sunken/60 text-fg-muted shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-surface-2 hover:text-fg-strong hover:shadow-[inset_0_0_0_1px_var(--color-line-2)]",
              "has-[:focus-visible]:shadow-focus",
            )}
          >
            <input
              type="radio"
              name={groupName}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              onClick={() => clearable && selected && onChange(null)}
              className="sr-only"
            />
            {option.icon && (
              <span className={cn("shrink-0 transition-colors [&_svg]:size-4", selected ? "text-accent" : "text-fg-subtle group-hover:text-fg-muted")}>
                {option.icon}
              </span>
            )}
            {option.tone && <span className="size-1.5 shrink-0 rounded-full" style={{ background: option.tone }} aria-hidden />}
            <span className="flex min-w-0 flex-col">
              <span className="text-body-sm leading-tight font-medium">{option.label}</span>
              {option.description && <span className="mt-0.5 text-caption tracking-normal text-fg-subtle">{option.description}</span>}
            </span>
            {selected && (
              <motion.span
                layoutId={`choice-check-${groupName}`}
                transition={{ type: "spring", stiffness: 520, damping: 38 }}
                className="ml-auto flex size-4 shrink-0 items-center justify-center rounded-full bg-accent"
                aria-hidden
              >
                <Check className="size-2.5 stroke-[3.5] text-fg-on-accent" />
              </motion.span>
            )}
          </label>
        );
      })}
    </div>
  );
}
