"use client";

import { useRef } from "react";
import { Plus } from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/input";
import { LIMITS } from "@/domain/project-form";
import { StepHeader } from "../step-header";
import type { StepProps } from "../types";

const PROMPTS = ["Contexto", "Expectativas", "Preocupações", "Riscos", "Pessoas", "Próximos passos"];

export function NotesStep({ values, set, errors, counter }: StepProps & { counter: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const words = values.observations.trim() ? values.observations.trim().split(/\s+/).length : 0;

  /** Inserts a small heading at the cursor so the thought has a place to start. */
  const insertPrompt = (prompt: string) => {
    const el = ref.current;
    const text = values.observations;
    const start = el?.selectionStart ?? text.length;
    const before = text.slice(0, start);
    const after = text.slice(el?.selectionEnd ?? start);
    const prefix = before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
    const insertion = `${prefix}${prompt}: `;
    set("observations", before + insertion + after);
    requestAnimationFrame(() => {
      el?.focus();
      const caret = (before + insertion).length;
      el?.setSelectionRange(caret, caret);
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <StepHeader
        counter={counter}
        title="Observações"
        description="Existe alguma informação, contexto, expectativa, preocupação ou detalhe que você considera importante para este projeto?"
      />

      <FormField label={<span className="sr-only">Observações</span>} error={errors.observations}>
        <div className="overflow-hidden rounded-lg bg-sunken/70 shadow-[inset_0_0_0_1px_var(--color-line-2)] transition-shadow focus-within:shadow-[inset_0_0_0_1px_rgb(215_196_133/0.5),0_0_0_3px_rgb(215_196_133/0.08)]">
          <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-3 py-2.5 sm:px-4">
            <span className="eyebrow mr-1">Começar por</span>
            {PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => insertPrompt(prompt)}
                className="flex h-7 items-center gap-1 rounded-xs px-2 text-caption tracking-normal text-fg-muted shadow-[inset_0_0_0_1px_var(--color-line)] transition-colors hover:bg-surface-2 hover:text-fg-strong"
              >
                <Plus className="size-3" aria-hidden />
                {prompt}
              </button>
            ))}
          </div>
          <Textarea
            ref={ref}
            value={values.observations}
            onChange={(e) => set("observations", e.target.value)}
            placeholder="Escreva livremente. Nada aqui precisa estar organizado — o importante é não se perder."
            minRows={14}
            className="rounded-none bg-transparent px-4 py-4 text-[1.0625rem] leading-[1.75] shadow-none hover:shadow-none focus:bg-transparent focus:shadow-none focus-visible:shadow-none sm:px-5 sm:py-5"
          />
          <div className="flex items-center justify-between border-t border-line px-4 py-2 sm:px-5">
            <span className="text-caption tracking-normal text-fg-subtle">Texto livre. Markdown, anexos e menções chegam em breve.</span>
            <span className="font-numeric text-caption tracking-normal text-fg-subtle" aria-live="polite">
              {words} {words === 1 ? "palavra" : "palavras"}
              {values.observations.length > LIMITS.observations * 0.9 && ` · ${values.observations.length}/${LIMITS.observations}`}
            </span>
          </div>
        </div>
      </FormField>
    </div>
  );
}
