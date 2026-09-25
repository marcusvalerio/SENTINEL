"use client";

import { forwardRef, useCallback, useLayoutEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { useField } from "./form-field";

export const controlStyles =
  "w-full rounded-md bg-sunken/70 text-fg-strong placeholder:text-fg-subtle/80 " +
  "shadow-[inset_0_0_0_1px_var(--color-line-2)] transition-[box-shadow,background-color] duration-150 " +
  "hover:shadow-[inset_0_0_0_1px_var(--color-line-3)] " +
  "focus:bg-sunken focus:shadow-[inset_0_0_0_1px_rgb(215_196_133/0.6),0_0_0_3px_rgb(215_196_133/0.1)] focus:outline-none focus-visible:shadow-[inset_0_0_0_1px_rgb(215_196_133/0.6),0_0_0_3px_rgb(215_196_133/0.1)] " +
  "aria-invalid:shadow-[inset_0_0_0_1px_rgb(224_146_143/0.6)] aria-invalid:focus:shadow-[inset_0_0_0_1px_rgb(224_146_143/0.8),0_0_0_3px_rgb(224_146_143/0.12)] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

function useFieldProps(id?: string, describedBy?: string, invalid?: boolean) {
  const field = useField();
  return {
    id: id ?? field?.id,
    "aria-describedby": describedBy ?? field?.describedBy,
    "aria-invalid": invalid ?? field?.invalid ? true : undefined,
  };
}

type InputProps = ComponentProps<"input"> & { leading?: ReactNode; trailing?: ReactNode; invalid?: boolean; inputSize?: "md" | "lg" };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, leading, trailing, invalid, inputSize = "md", id, "aria-describedby": describedBy, ...props },
  ref,
) {
  const fieldProps = useFieldProps(id, describedBy, invalid);
  const input = (
    <input
      ref={ref}
      {...fieldProps}
      className={cn(
        controlStyles,
        inputSize === "lg" ? "h-12 px-4 text-body" : "h-10 px-3 text-body-sm",
        "max-sm:text-base",
        leading && "pl-9",
        trailing && "pr-10",
        className,
      )}
      {...props}
    />
  );
  if (!leading && !trailing) return input;
  return (
    <div className="relative">
      {leading && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-subtle [&_svg]:size-4">
          {leading}
        </span>
      )}
      {input}
      {trailing && <span className="absolute inset-y-0 right-3 flex items-center text-fg-subtle">{trailing}</span>}
    </div>
  );
});

type TextareaProps = ComponentProps<"textarea"> & { invalid?: boolean; autoGrow?: boolean; minRows?: number };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, autoGrow = true, minRows = 3, id, "aria-describedby": describedBy, onChange, value, ...props },
  forwardedRef,
) {
  const fieldProps = useFieldProps(id, describedBy, invalid);
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  const resize = useCallback(() => {
    const el = innerRef.current;
    if (!el || !autoGrow) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [autoGrow]);

  useLayoutEffect(resize, [resize, value]);

  return (
    <textarea
      ref={(el) => {
        innerRef.current = el;
        if (typeof forwardedRef === "function") forwardedRef(el);
        else if (forwardedRef) forwardedRef.current = el;
      }}
      rows={minRows}
      value={value}
      onChange={(event) => {
        onChange?.(event);
        resize();
      }}
      {...fieldProps}
      className={cn(
        controlStyles,
        "block resize-none px-3.5 py-3 text-body leading-relaxed max-sm:text-base",
        !autoGrow && "resize-y",
        className,
      )}
      {...props}
    />
  );
});

type SelectProps = ComponentProps<"select"> & { invalid?: boolean; placeholder?: string };

/** Native select, styled — keeps platform accessibility and mobile pickers. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, placeholder, children, id, "aria-describedby": describedBy, ...props },
  ref,
) {
  const fieldProps = useFieldProps(id, describedBy, invalid);
  return (
    <div className="relative">
      <select
        ref={ref}
        {...fieldProps}
        className={cn(controlStyles, "h-10 cursor-pointer appearance-none pl-3 pr-9 text-body-sm max-sm:text-base", className)}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
    </div>
  );
});
