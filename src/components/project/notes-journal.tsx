"use client";

import { AnimatePresence, motion } from "motion/react";
import { MoreHorizontal, PencilLine, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Dropdown } from "@/components/ui/dropdown";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { NOTE_TYPES, NOTE_TYPE_LABELS, type NoteType } from "@/domain/notes";
import { cn } from "@/lib/cn";
import { dayKey, formatTime } from "@/lib/format";
import { deleteNote } from "@/server/notes/actions";
import { NoteForm } from "./note-composer";
import { NoteTypeTag } from "./note-meta";

export type JournalNote = { id: string; title: string; content: string; type: NoteType; createdAt: string; updatedAt: string };

function dayLabel(key: string) {
  const date = new Date(`${key}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(date);
  const full = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  return { weekday, full, numeric: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date) };
}

export function NotesJournal({ projectId, notes }: { projectId: string; notes: JournalNote[] }) {
  const [filter, setFilter] = useState<NoteType | "all">("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<JournalNote | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const visible = notes.filter((n) => !hidden.has(n.id) && (filter === "all" || n.type === filter));
  const counts = useMemo(() => {
    const map = new Map<NoteType, number>();
    for (const n of notes) map.set(n.type, (map.get(n.type) ?? 0) + 1);
    return map;
  }, [notes]);

  const groups = useMemo(() => {
    const map = new Map<string, JournalNote[]>();
    for (const note of visible) {
      const key = dayKey(note.createdAt);
      map.set(key, [...(map.get(key) ?? []), note]);
    }
    return Array.from(map.entries());
  }, [visible]);

  const confirmDelete = () => {
    const note = deleting;
    if (!note) return;
    setDeleting(null);
    setHidden((h) => new Set(h).add(note.id));
    startTransition(async () => {
      const result = await deleteNote(projectId, note.id);
      if (!result.ok) {
        setHidden((h) => {
          const next = new Set(h);
          next.delete(note.id);
          return next;
        });
        toast.show({ tone: "error", title: "Não foi possível excluir", description: result.error });
      } else toast.show({ title: "Registro excluído" });
    });
  };

  return (
    <div className="flex flex-col gap-8">
      {notes.length > 0 && (
        <div role="group" aria-label="Filtrar por tipo" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          {(["all", ...NOTE_TYPES.filter((t) => counts.has(t))] as const).map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={filter === type}
              onClick={() => setFilter(type)}
              className={cn(
                "flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-caption font-medium tracking-normal transition-colors",
                filter === type ? "bg-fg-strong text-canvas" : "text-fg-muted shadow-[inset_0_0_0_1px_var(--color-line-2)] hover:text-fg-strong",
              )}
            >
              {type === "all" ? "Todos" : NOTE_TYPE_LABELS[type]}
              <span className={cn("font-numeric", filter === type ? "text-canvas/60" : "text-fg-subtle")}>{type === "all" ? notes.length : counts.get(type)}</span>
            </button>
          ))}
        </div>
      )}

      {groups.length === 0 && notes.length > 0 && <p className="py-10 text-center text-body-sm text-fg-muted">Nenhum registro deste tipo.</p>}

      <div className="flex flex-col gap-10">
        {groups.map(([key, items]) => {
          const label = dayLabel(key);
          return (
            <section key={key} aria-label={label.full} className="grid gap-4 md:grid-cols-[150px_minmax(0,1fr)] md:gap-8">
              <header className="md:sticky md:top-20 md:self-start">
                <p className="font-numeric font-display text-h4 font-medium text-fg-strong">{label.numeric}</p>
                <p className="text-caption tracking-normal text-fg-subtle first-letter:uppercase">{label.weekday}</p>
              </header>
              <ol className="relative flex flex-col gap-3 before:absolute before:top-2 before:bottom-2 before:-left-4 before:hidden before:w-px before:bg-line-2 md:before:block">
                <AnimatePresence initial={false}>
                  {items.map((note) => (
                    <motion.li
                      key={note.id}
                      id={`note-${note.id}`}
                      layout="position"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.2 } }}
                      transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
                      className="scroll-mt-24 target:[&>article]:shadow-[inset_0_0_0_1px_rgb(215_196_133/0.5)]"
                    >
                      <article className="rounded-lg bg-surface/70 p-4 shadow-[inset_0_0_0_1px_var(--color-line)] transition-shadow sm:p-5">
                        {editing === note.id ? (
                          <NoteForm projectId={projectId} initial={note} autoFocus onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />
                        ) : (
                          <div className="flex flex-col gap-2.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <NoteTypeTag type={note.type} />
                                <time dateTime={note.createdAt} className="font-numeric text-caption tracking-normal text-fg-subtle" suppressHydrationWarning>
                                  {formatTime(note.createdAt)}
                                  {note.updatedAt !== note.createdAt && new Date(note.updatedAt).getTime() - new Date(note.createdAt).getTime() > 60_000 && " · editado"}
                                </time>
                              </div>
                              <Dropdown
                                width={180}
                                trigger={({ ref, toggle, ...aria }) => (
                                  <button ref={ref} type="button" onClick={toggle} {...aria} aria-label={`Ações para ${note.title}`} className="-mt-1 -mr-1.5 flex size-7 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg-strong">
                                    <MoreHorizontal className="size-4" />
                                  </button>
                                )}
                                items={[
                                  { label: "Editar", icon: <PencilLine />, onSelect: () => setEditing(note.id) },
                                  { label: "Excluir", icon: <Trash2 />, tone: "danger", onSelect: () => setDeleting(note) },
                                ]}
                              />
                            </div>
                            <h3 className={cn("font-display text-h4 font-medium text-fg-strong", note.type === "discarded_idea" && "text-fg-muted line-through decoration-fg-subtle/60")}>{note.title}</h3>
                            {note.content && <p className="max-w-[72ch] text-body whitespace-pre-line text-fg">{note.content}</p>}
                          </div>
                        )}
                      </article>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ol>
            </section>
          );
        })}
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={pending}
        title="Excluir registro?"
        description={`“${deleting?.title ?? ""}” será removido da Rubrica. Isso não pode ser desfeito.`}
        confirmLabel="Excluir"
      />
    </div>
  );
}
