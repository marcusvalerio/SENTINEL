"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowDownUp, History, MoreHorizontal, PencilLine, Search, Trash2, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { Markdown } from "@/components/ui/markdown";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { filterJournal, tagCounts, type JournalFilter } from "@/domain/journal";
import { NOTE_TYPES, NOTE_TYPE_LABELS, type NoteType } from "@/domain/notes";
import { cn } from "@/lib/cn";
import { dayKey, formatDateTime, formatTime } from "@/lib/format";
import { deleteNote, getNoteRevisions } from "@/server/notes/actions";
import { NoteForm } from "./note-composer";
import { NoteTypeTag } from "./note-meta";

export type JournalNote = { id: string; title: string; content: string; type: NoteType; tags: string[]; createdAt: string; updatedAt: string };
type Revision = { id: string; title: string; content: string; type: NoteType; tags: string[]; createdAt: string };

function dayLabel(key: string) {
  const date = new Date(`${key}T12:00:00Z`);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { ...o, timeZone: "UTC" }).format(date);
  return { weekday: f({ weekday: "long" }), full: f({ day: "2-digit", month: "long", year: "numeric" }), numeric: f({ day: "2-digit", month: "2-digit", year: "numeric" }) };
}

export function NotesJournal({ projectId, notes }: { projectId: string; notes: JournalNote[] }) {
  const [filter, setFilter] = useState<JournalFilter>({ query: "", type: "all", tag: null, order: "newest" });
  const query = useDeferredValue(filter.query);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<JournalNote | null>(null);
  const [history, setHistory] = useState<{ note: JournalNote; revisions: Revision[] | null } | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // "/" focuses the journal search — keyboard-first like the rest of SENTINEL.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const live = useMemo(() => notes.filter((n) => !hidden.has(n.id)), [notes, hidden]);
  const visible = useMemo(() => filterJournal(live, { ...filter, query }), [live, filter, query]);
  const typeCounts = useMemo(() => {
    const map = new Map<NoteType, number>();
    for (const n of live) map.set(n.type, (map.get(n.type) ?? 0) + 1);
    return map;
  }, [live]);
  const tags = useMemo(() => tagCounts(live), [live]);
  const knownTags = tags.map(([t]) => t);

  const groups = useMemo(() => {
    const map = new Map<string, JournalNote[]>();
    for (const note of visible) {
      const key = dayKey(note.createdAt);
      map.set(key, [...(map.get(key) ?? []), note]);
    }
    return Array.from(map.entries());
  }, [visible]);

  const filtered = filter.query.trim() !== "" || filter.type !== "all" || filter.tag !== null;

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

  const openHistory = (note: JournalNote) => {
    setHistory({ note, revisions: null });
    startTransition(async () => {
      const result = await getNoteRevisions(projectId, note.id);
      setHistory({ note, revisions: result.ok ? result.revisions : [] });
    });
  };

  const tagChip = (tag: string) => (
    <button
      type="button"
      onClick={() => setFilter((f) => ({ ...f, tag: f.tag === tag ? null : tag }))}
      className={cn("rounded-xs px-0.5 text-info transition-colors hover:bg-identity", filter.tag === tag && "bg-identity")}
    >
      #{tag}
    </button>
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Search & filters */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            ref={searchRef}
            value={filter.query}
            onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
            onKeyDown={(e) => e.key === "Escape" && setFilter((f) => ({ ...f, query: "" }))}
            placeholder="Pesquisar na Rubrica…"
            aria-label="Pesquisar na Rubrica"
            leading={<Search />}
            trailing={<kbd className="font-mono text-[10px] text-fg-subtle">/</kbd>}
          />
          <button
            type="button"
            onClick={() => setFilter((f) => ({ ...f, order: f.order === "newest" ? "oldest" : "newest" }))}
            className="flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-body-sm text-fg-muted shadow-[inset_0_0_0_1px_var(--color-line-2)] transition-colors hover:bg-surface-2 hover:text-fg-strong"
            aria-label={`Ordenar: ${filter.order === "newest" ? "mais recentes primeiro" : "mais antigos primeiro"}`}
          >
            <ArrowDownUp className="size-4" aria-hidden />
            <span className="hidden sm:inline">{filter.order === "newest" ? "Recentes" : "Antigos"}</span>
          </button>
        </div>
        <div role="group" aria-label="Filtrar por tipo" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          {(["all", ...NOTE_TYPES.filter((t) => typeCounts.has(t))] as const).map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={filter.type === type}
              onClick={() => setFilter((f) => ({ ...f, type }))}
              className={cn(
                "flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-caption font-medium tracking-normal transition-colors",
                filter.type === type ? "bg-fg-strong text-canvas" : "text-fg-muted shadow-[inset_0_0_0_1px_var(--color-line-2)] hover:text-fg-strong",
              )}
            >
              {type === "all" ? "Todos" : NOTE_TYPE_LABELS[type]}
              <span className={cn("font-numeric", filter.type === type ? "text-canvas/60" : "text-fg-subtle")}>{type === "all" ? live.length : typeCounts.get(type)}</span>
            </button>
          ))}
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1" aria-label="Filtrar por tag">
            {tags.slice(0, 16).map(([tag, count]) => (
              <button
                key={tag}
                type="button"
                aria-pressed={filter.tag === tag}
                onClick={() => setFilter((f) => ({ ...f, tag: f.tag === tag ? null : tag }))}
                className={cn("flex h-6 items-center gap-1 rounded-xs px-1.5 text-caption tracking-normal transition-colors", filter.tag === tag ? "bg-identity text-[#b8c5ea]" : "text-fg-subtle hover:bg-surface-2 hover:text-fg")}
              >
                #{tag}
                <span className="font-numeric opacity-60">{count}</span>
              </button>
            ))}
          </div>
        )}
        <AnimatePresence initial={false}>
          {filtered && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 overflow-hidden text-caption tracking-normal text-fg-muted" aria-live="polite">
              <span className="font-numeric">{visible.length}</span> de <span className="font-numeric">{live.length}</span> registros
              <button type="button" onClick={() => setFilter({ query: "", type: "all", tag: null, order: filter.order })} className="flex items-center gap-1 rounded-xs px-1 text-fg-subtle hover:text-fg-strong">
                <X className="size-3" aria-hidden />
                Limpar filtros
              </button>
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {groups.length === 0 && <p className="py-10 text-center text-body-sm text-fg-muted">Nenhum registro corresponde à busca.</p>}

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
                      transition={{ duration: 0.26, ease: [0.25, 1, 0.5, 1] }}
                      className="scroll-mt-24 target:[&>article]:shadow-[inset_0_0_0_1px_rgb(215_196_133/0.5)]"
                    >
                      <article className="rounded-lg bg-surface/70 p-4 shadow-[inset_0_0_0_1px_var(--color-line)] transition-shadow sm:p-5">
                        {editing === note.id ? (
                          <NoteForm projectId={projectId} initial={note} knownTags={knownTags} autoFocus onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />
                        ) : (
                          <div className="flex flex-col gap-2.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <NoteTypeTag type={note.type} />
                                <time dateTime={note.createdAt} className="font-numeric text-caption tracking-normal text-fg-subtle" suppressHydrationWarning>
                                  {formatTime(note.createdAt)}
                                  {new Date(note.updatedAt).getTime() - new Date(note.createdAt).getTime() > 60_000 && " · editado"}
                                </time>
                              </div>
                              <Dropdown
                                width={200}
                                trigger={({ ref, toggle, ...aria }) => (
                                  <button ref={ref} type="button" onClick={toggle} {...aria} aria-label={`Ações para ${note.title}`} className="-mt-1 -mr-1.5 flex size-7 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg-strong">
                                    <MoreHorizontal className="size-4" />
                                  </button>
                                )}
                                items={[
                                  { label: "Editar", icon: <PencilLine />, onSelect: () => setEditing(note.id) },
                                  { label: "Histórico de edições", icon: <History />, onSelect: () => openHistory(note) },
                                  { label: "Excluir", icon: <Trash2 />, tone: "danger", onSelect: () => setDeleting(note) },
                                ]}
                              />
                            </div>
                            <h3 className={cn("font-display text-h4 font-medium text-fg-strong", note.type === "discarded_idea" && "text-fg-muted line-through decoration-fg-subtle/60")}>{note.title}</h3>
                            {note.content && <Markdown source={note.content} onTag={tagChip} />}
                            {note.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 text-caption tracking-normal">
                                {note.tags.map((t) => (
                                  <span key={t}>{tagChip(t)}</span>
                                ))}
                              </div>
                            )}
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
        description={`“${deleting?.title ?? ""}” será removido da Rubrica, com seu histórico de edições. Isso não pode ser desfeito.`}
        confirmLabel="Excluir"
      />

      <Modal open={Boolean(history)} onClose={() => setHistory(null)} size="lg" title="Histórico de edições" description={history?.note.title}>
        {history &&
          (history.revisions === null ? (
            <div className="flex justify-center py-8">
              <Spinner className="text-fg-muted" label="Carregando histórico" />
            </div>
          ) : history.revisions.length === 0 ? (
            <p className="py-6 text-center text-body-sm text-fg-muted">Este registro nunca foi editado.</p>
          ) : (
            <ol className="flex flex-col gap-4">
              {history.revisions.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 rounded-md bg-sunken/60 p-4 shadow-[inset_0_0_0_1px_var(--color-line)]">
                  <p className="flex items-center gap-2 text-caption tracking-normal text-fg-subtle" suppressHydrationWarning>
                    Versão substituída em <span className="font-numeric text-fg-muted">{formatDateTime(r.createdAt)}</span>
                    <NoteTypeTag type={r.type} />
                  </p>
                  <p className="font-display text-body font-medium text-fg-strong">{r.title}</p>
                  {r.content && <Markdown source={r.content} className="text-body-sm text-fg-muted" />}
                </li>
              ))}
            </ol>
          ))}
      </Modal>
    </div>
  );
}
