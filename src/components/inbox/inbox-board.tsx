"use client";

import { AnimatePresence, motion } from "motion/react";
import { Archive, ArchiveRestore, ArrowRight, ClipboardList, CornerDownLeft, Flag, FolderPlus, Lightbulb, ListPlus, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { IDEA_TARGET_LABELS, type IdeaStatus, type IdeaTarget } from "@/domain/ideas";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/format";
import { captureIdea, convertIdea, deleteIdea, setIdeaStatus } from "@/server/ideas/actions";

export type IdeaRow = {
  id: string;
  text: string;
  status: IdeaStatus;
  createdAt: string;
  convertedKind: string | null;
  convertedId: string | null;
  project: { id: string; name: string } | null;
};

const CONVERTED_LABEL: Record<string, string> = { feature: "Virou funcionalidade", milestone: "Virou milestone", project_draft: "Virou rascunho de projeto", pre_project: "Virou pré-projeto" };

function convertedHref(i: IdeaRow) {
  if (i.convertedKind === "pre_project") return `/pre-projects/${i.convertedId}`;
  if (i.convertedKind === "project_draft") return `/projects/new?draft=${i.convertedId}`;
  if (i.project) return `/projects/${i.project.id}/roadmap`;
  return null;
}

export function InboxBoard({ ideas, projects }: { ideas: IdeaRow[]; projects: { id: string; name: string }[] }) {
  const [optimistic, apply] = useOptimistic(ideas, (state, action: { type: "add"; idea: IdeaRow } | { type: "remove"; id: string } | { type: "status"; id: string; status: IdeaStatus }) => {
    if (action.type === "add") return [action.idea, ...state];
    if (action.type === "remove") return state.filter((i) => i.id !== action.id);
    return state.map((i) => (i.id === action.id ? { ...i, status: action.status } : i));
  });
  const [text, setText] = useState("");
  const [converting, setConverting] = useState<{ idea: IdeaRow; target: "feature" | "milestone" } | null>(null);
  const [projectId, setProjectId] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [saving, startSaving] = useTransition();
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const router = useRouter();

  const inbox = optimistic.filter((i) => i.status === "inbox");
  const converted = optimistic.filter((i) => i.status === "converted");
  const archived = optimistic.filter((i) => i.status === "archived");

  const capture = () => {
    const value = text.trim();
    if (!value) return;
    setText("");
    startSaving(async () => {
      apply({ type: "add", idea: { id: `tmp-${Date.now()}`, text: value, status: "inbox", createdAt: new Date().toISOString(), convertedKind: null, convertedId: null, project: null } });
      const result = await captureIdea({ text: value });
      if (!result.ok) {
        setText(value);
        toast.show({ tone: "error", title: "Não foi possível guardar", description: result.error });
      }
      inputRef.current?.focus();
    });
  };

  const convert = (idea: IdeaRow, target: IdeaTarget, pid?: string) =>
    startTransition(async () => {
      const result = await convertIdea(idea.id, target, pid);
      if (!result.ok) {
        toast.show({ tone: "error", title: "Não foi possível converter", description: result.error });
        return;
      }
      toast.show({ title: IDEA_TARGET_LABELS[target] + " criada a partir da ideia" });
      setConverting(null);
      router.push(result.href);
    });

  const status = (idea: IdeaRow, s: "inbox" | "archived") =>
    startTransition(async () => {
      apply({ type: "status", id: idea.id, status: s });
      await setIdeaStatus(idea.id, s);
    });

  const remove = (idea: IdeaRow) =>
    startTransition(async () => {
      apply({ type: "remove", id: idea.id });
      await deleteIdea(idea.id);
    });

  return (
    <div className="flex flex-col gap-14">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          capture();
        }}
        className="group flex items-center gap-4 border-b border-line-2 pb-4 transition-colors focus-within:border-accent/50"
      >
        <Lightbulb className="size-5 shrink-0 text-accent" aria-hidden />
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          autoFocus
          placeholder="Adicionar dashboard financeiro…"
          aria-label="Nova ideia"
          className="min-w-0 flex-1 bg-transparent font-display text-h3 font-normal text-fg-strong outline-none placeholder:text-fg-subtle/70 focus-visible:shadow-none sm:text-h2"
        />
        <span className="hidden shrink-0 items-center gap-1.5 text-caption tracking-normal text-fg-subtle sm:flex">
          {saving ? <Spinner className="size-3.5" /> : <CornerDownLeft className="size-3.5" aria-hidden />}
          guardar
        </span>
      </form>

      <section aria-labelledby="inbox-heading" className="flex flex-col gap-3">
        <h2 id="inbox-heading" className="eyebrow flex items-center gap-2">
          Na Inbox <span className="font-numeric">{inbox.length}</span>
        </h2>
        {inbox.length === 0 ? (
          <p className="py-6 text-body text-fg-muted">A Inbox está vazia. Pressione <kbd className="font-mono text-fg">I</kbd> em qualquer lugar para capturar uma ideia.</p>
        ) : (
          <ul className="flex flex-col">
            <AnimatePresence initial={false}>
              {inbox.map((idea) => (
                <motion.li
                  key={idea.id}
                  layout="position"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
                  transition={{ type: "spring", stiffness: 480, damping: 38 }}
                  className="border-t border-line first:border-t-0"
                >
                  <div className="group row-hover -mx-3 flex items-start gap-4 rounded-md px-3 py-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="text-body whitespace-pre-line text-fg-strong">{idea.text}</p>
                      <p className="text-caption tracking-normal text-fg-subtle" suppressHydrationWarning>
                        {formatRelative(idea.createdAt)}
                        {idea.project && <> · {idea.project.name}</>}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                      <Dropdown
                        width={230}
                        trigger={({ ref, toggle, ...aria }) => (
                          <button ref={ref} type="button" onClick={toggle} {...aria} disabled={idea.id.startsWith("tmp-")} className="flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-caption font-medium tracking-normal text-fg-muted shadow-[inset_0_0_0_1px_var(--color-line-2)] transition-colors hover:bg-surface-2 hover:text-fg-strong">
                            Transformar em
                            <ArrowRight className="size-3.5" aria-hidden />
                          </button>
                        )}
                        items={[
                          { label: "Funcionalidade", icon: <ListPlus />, onSelect: () => { setProjectId(idea.project?.id ?? projects[0]?.id ?? ""); setConverting({ idea, target: "feature" }); } },
                          { label: "Milestone", icon: <Flag />, onSelect: () => { setProjectId(idea.project?.id ?? projects[0]?.id ?? ""); setConverting({ idea, target: "milestone" }); } },
                          { type: "separator" },
                          { label: "Novo projeto", icon: <FolderPlus />, onSelect: () => convert(idea, "project") },
                          { label: "Pré-projeto", icon: <ClipboardList />, onSelect: () => convert(idea, "pre_project") },
                        ]}
                      />
                      <Dropdown
                        width={180}
                        trigger={({ ref, toggle, ...aria }) => (
                          <button ref={ref} type="button" onClick={toggle} {...aria} aria-label="Mais ações" disabled={idea.id.startsWith("tmp-")} className="flex size-8 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg-strong">
                            <MoreHorizontal className="size-4" />
                          </button>
                        )}
                        items={[
                          { label: "Arquivar", icon: <Archive />, onSelect: () => status(idea, "archived") },
                          { label: "Excluir", icon: <Trash2 />, tone: "danger", onSelect: () => remove(idea) },
                        ]}
                      />
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>

      {converted.length > 0 && (
        <section aria-labelledby="converted-heading" className="flex flex-col gap-3">
          <h2 id="converted-heading" className="eyebrow flex items-center gap-2">
            Transformadas <span className="font-numeric">{converted.length}</span>
          </h2>
          <ul className="flex flex-col">
            {converted.map((idea) => {
              const href = convertedHref(idea);
              return (
                <li key={idea.id} className="flex items-baseline justify-between gap-4 border-t border-line py-3 first:border-t-0">
                  <span className="min-w-0 truncate text-body-sm text-fg-muted line-through decoration-fg-subtle/40">{idea.text}</span>
                  {href ? (
                    <Link href={href} className="shrink-0 text-caption tracking-normal text-accent hover:underline">
                      {CONVERTED_LABEL[idea.convertedKind ?? ""] ?? "Convertida"} →
                    </Link>
                  ) : (
                    <span className="shrink-0 text-caption tracking-normal text-fg-subtle">{CONVERTED_LABEL[idea.convertedKind ?? ""] ?? "Convertida"}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {archived.length > 0 && (
        <section className="flex flex-col gap-3">
          <button type="button" onClick={() => setShowArchived((v) => !v)} aria-expanded={showArchived} className="eyebrow flex w-fit items-center gap-2 hover:text-fg">
            Arquivadas <span className="font-numeric">{archived.length}</span>
          </button>
          <AnimatePresence initial={false}>
            {showArchived && (
              <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-col overflow-hidden">
                {archived.map((idea) => (
                  <li key={idea.id} className="flex items-center justify-between gap-4 border-t border-line py-2.5 first:border-t-0">
                    <span className="min-w-0 truncate text-body-sm text-fg-subtle">{idea.text}</span>
                    <button type="button" onClick={() => status(idea, "inbox")} className="flex shrink-0 items-center gap-1.5 text-caption tracking-normal text-fg-muted hover:text-fg-strong">
                      <ArchiveRestore className="size-3.5" aria-hidden /> Restaurar
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </section>
      )}

      <Modal
        open={Boolean(converting)}
        onClose={() => setConverting(null)}
        size="sm"
        title={converting?.target === "feature" ? "Transformar em funcionalidade" : "Transformar em milestone"}
        description={converting?.idea.text}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConverting(null)}>
              Cancelar
            </Button>
            <Button variant="primary" disabled={!projectId} onClick={() => converting && convert(converting.idea, converting.target, projectId)}>
              Transformar
            </Button>
          </>
        }
      >
        {projects.length === 0 ? (
          <p className="text-body-sm text-fg-muted">Crie um projeto primeiro.</p>
        ) : (
          <FormField label="Projeto">
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        <p className={cn("mt-4 text-caption tracking-normal text-fg-subtle")}>
          {converting?.target === "feature" ? "Entra no roadmap do projeto em “Later”, com origem “Inbox”." : "Entra no roadmap como milestone planejado."}
        </p>
      </Modal>
    </div>
  );
}
