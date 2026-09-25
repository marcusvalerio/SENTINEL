"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus, Trash2, Wrench } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { addTool, removeTool } from "@/server/tools/actions";

type Tool = { id: string; name: string; purpose: string | null; plan: string | null };

const SUGGESTIONS: { name: string; purpose: string }[] = [
  { name: "Claude", purpose: "Desenvolvimento, arquitetura e QA" },
  { name: "ChatGPT", purpose: "Pesquisa e ideação" },
  { name: "Figma", purpose: "UI/UX e prototipação" },
  { name: "GitHub", purpose: "Versionamento" },
  { name: "Vercel", purpose: "Hospedagem e deploy" },
  { name: "Neon", purpose: "Banco de dados PostgreSQL" },
  { name: "Supabase", purpose: "Backend e banco de dados" },
  { name: "Lovable", purpose: "Prototipação com IA" },
  { name: "Cursor", purpose: "Editor de código" },
  { name: "VS Code", purpose: "Editor de código" },
];

export function ToolsManager({ projectId, tools }: { projectId: string; tools: Tool[] }) {
  const [optimistic, removeOptimistic] = useOptimistic(tools, (state, id: string) => state.filter((t) => t.id !== id));
  const [form, setForm] = useState({ name: "", purpose: "", plan: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [, startRemoving] = useTransition();
  const toast = useToast();

  const registered = new Set(optimistic.map((t) => t.name.toLowerCase()));
  const suggestions = SUGGESTIONS.filter((s) => !registered.has(s.name.toLowerCase()));

  const submit = (input = form) =>
    startSaving(async () => {
      const result = await addTool(projectId, { ...input, notes: "" });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setForm({ name: "", purpose: "", plan: "" });
      toast.show({ title: `${input.name} registrada` });
    });

  const remove = (tool: Tool) =>
    startRemoving(async () => {
      removeOptimistic(tool.id);
      const result = await removeTool(projectId, tool.id);
      if (!result.ok) toast.show({ tone: "error", title: "Não foi possível remover", description: result.error });
    });

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
      <div className="flex flex-col gap-4">
        {optimistic.length === 0 ? (
          <EmptyState compact icon={<Wrench />} title="Nenhuma ferramenta registrada." description="Registre o que foi usado para pensar, desenhar, construir e operar este projeto." />
        ) : (
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-lg bg-surface/60 shadow-[inset_0_0_0_1px_var(--color-line)]">
            <AnimatePresence initial={false}>
              {optimistic.map((tool) => (
                <motion.li key={tool.id} layout="position" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="group flex items-center gap-4 px-4 py-3.5 sm:px-5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sunken font-display text-body-sm font-semibold text-fg-muted shadow-[inset_0_0_0_1px_var(--color-line-2)]" aria-hidden>
                    {tool.name.slice(0, 2)}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-body-sm font-medium text-fg-strong">{tool.name}</span>
                    <span className="truncate text-body-sm text-fg-muted">{tool.purpose ?? <span className="text-fg-subtle italic">Finalidade não informada</span>}</span>
                  </div>
                  {tool.plan && <span className="hidden shrink-0 text-caption tracking-normal text-fg-subtle sm:inline">{tool.plan}</span>}
                  <IconButton label={`Remover ${tool.name}`} size="sm" tone="danger" onClick={() => remove(tool)} className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100">
                    <Trash2 />
                  </IconButton>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <aside className="flex flex-col gap-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-4 rounded-lg bg-surface p-5 shadow-[inset_0_0_0_1px_var(--color-line-2)]"
        >
          <h2 className="font-display text-h4 font-medium text-fg-strong">Registrar ferramenta</h2>
          <FormField label="Nome" required error={error}>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: Figma" autoComplete="off" />
          </FormField>
          <FormField label="Finalidade" optional>
            <Input value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} placeholder="Para que foi usada" autoComplete="off" />
          </FormField>
          <FormField label="Plano" optional>
            <Input value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))} placeholder="Free, Pro, Team…" autoComplete="off" />
          </FormField>
          <Button type="submit" variant="primary" loading={saving} disabled={!form.name.trim()} leading={<Plus />}>
            Registrar
          </Button>
        </form>

        {suggestions.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="eyebrow">Adicionar rapidamente</h3>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  disabled={saving}
                  onClick={() => submit({ name: s.name, purpose: s.purpose, plan: "" })}
                  className="flex h-7 items-center gap-1 rounded-full px-2.5 text-caption tracking-normal text-fg-muted shadow-[inset_0_0_0_1px_var(--color-line-2)] transition-colors hover:bg-surface-2 hover:text-fg-strong disabled:opacity-50"
                >
                  <Plus className="size-3" aria-hidden />
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
