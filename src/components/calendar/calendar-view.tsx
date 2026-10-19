"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, Plus, Sparkles, X, Trash2 } from "lucide-react";
import { createCalendarCommitment, deleteCalendarCommitment, type CalendarCommitment } from "@/server/calendar/actions";

type Project = { id: string; name: string; codename: string | null };
type CalendarMode = "month" | "week" | "day";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromKey = (value: string) => { const parts = value.split("-"); return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])); };
const mondayFor = (date: Date) => { const start = new Date(date); start.setDate(date.getDate() - ((date.getDay() + 6) % 7)); start.setHours(0, 0, 0, 0); return start; };

export function CalendarView({ projects, initialEvents }: { projects: Project[]; initialEvents: CalendarCommitment[] }) {
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(dateKey(today));
  const [mode, setMode] = useState<CalendarMode>("month");
  const [events, setEvents] = useState<CalendarCommitment[]>(initialEvents);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("10:00");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const days = useMemo(() => {
    if (mode === "day") {
      const date = fromKey(selected);
      return [{ date, key: selected, inMonth: date.getMonth() === month.getMonth() }];
    }
    if (mode === "week") {
      const start = mondayFor(fromKey(selected));
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(start); date.setDate(start.getDate() + i);
        return { date, key: dateKey(date), inMonth: date.getMonth() === month.getMonth() };
      });
    }
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first); start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(start); date.setDate(start.getDate() + i);
      return { date, key: dateKey(date), inMonth: date.getMonth() === month.getMonth() };
    });
  }, [month, mode, selected]);

  const agenda = events.filter((event) => event.date === selected).sort((a, b) => a.time.localeCompare(b.time));
  const selectedDate = fromKey(selected);
  const monthLabel = `${MONTHS[month.getMonth()]} de ${month.getFullYear()}`;

  function movePeriod(direction: -1 | 1) {
    const next = fromKey(selected);
    if (mode === "month") {
      const target = new Date(month.getFullYear(), month.getMonth() + direction, 1);
      setMonth(target);
      const nextSelected = new Date(target.getFullYear(), target.getMonth(), Math.min(selectedDate.getDate(), new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()));
      setSelected(dateKey(nextSelected));
    } else {
      next.setDate(next.getDate() + (mode === "week" ? 7 : 1) * direction);
      setSelected(dateKey(next));
      setMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    }
  }

  function addCommitment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    startTransition(async () => {
      try {
        const next = await createCalendarCommitment({ title, date: selected, time, projectId: projectId || null, notes });
        setEvents(next); setTitle(""); setNotes(""); setTime("10:00"); setAdding(false);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Não foi possível salvar o compromisso.");
      }
    });
  }

  function removeCommitment(id: string) {
    setError("");
    startTransition(async () => {
      try { setEvents(await deleteCalendarCommitment(id)); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível excluir o compromisso."); }
    });
  }

  return (
    <section className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-7 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <div className="eyebrow flex items-center gap-2"><CalendarDays className="size-3.5" /> Planejamento</div>
          <h1 className="text-display font-medium tracking-[-0.045em]">Calendário</h1>
          <p className="max-w-xl text-body text-fg-muted">Prazos, reuniões e próximos passos conectados à memória dos seus projetos.</p>
        </div>
        <button onClick={() => { setError(""); setAdding((value) => !value); }} className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-full bg-accent px-5 text-sm font-medium text-fg-on-accent shadow-raised transition hover:brightness-105 disabled:opacity-50 sm:self-auto" disabled={isPending}><Plus className="size-4" /> Novo compromisso</button>
      </header>

      {error && <div role="alert" className="rounded-xl border border-red-400/25 bg-red-500/8 px-4 py-3 text-sm text-red-500">{error}</div>}

      {adding && <form onSubmit={addCommitment} className="grid gap-4 rounded-2xl border border-line bg-surface p-5 shadow-raised md:grid-cols-2 xl:grid-cols-[1.5fr_140px_1fr_1.5fr_auto]">
        <label className="grid gap-1.5 text-sm text-fg-muted">Compromisso<input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={180} placeholder="Ex.: Revisar entregas da sprint" required className="h-10 rounded-xl border border-line-2 bg-canvas px-3 text-fg-strong outline-none focus:border-accent" /></label>
        <label className="grid gap-1.5 text-sm text-fg-muted">Horário<input type="time" value={time} onChange={(e) => setTime(e.target.value)} required className="h-10 rounded-xl border border-line-2 bg-canvas px-3 text-fg-strong outline-none focus:border-accent" /></label>
        <label className="grid gap-1.5 text-sm text-fg-muted">Projeto<select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-10 rounded-xl border border-line-2 bg-canvas px-3 text-fg-strong outline-none focus:border-accent"><option value="">Sem projeto vinculado</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm text-fg-muted">Observações<input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1200} placeholder="Contexto opcional" className="h-10 rounded-xl border border-line-2 bg-canvas px-3 text-fg-strong outline-none focus:border-accent" /></label>
        <div className="flex items-end gap-2"><button type="submit" disabled={isPending} className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-fg-on-accent disabled:opacity-50"><Check className="size-4" /> {isPending ? "Salvando…" : "Salvar"}</button><button type="button" onClick={() => setAdding(false)} className="flex size-10 items-center justify-center rounded-full border border-line-2 text-fg-muted hover:bg-surface-2" aria-label="Cancelar"><X className="size-4" /></button></div>
      </form>}

      <div className="grid min-h-[620px] gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-raised sm:p-6">
          <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div><h2 className="text-h2 font-medium capitalize tracking-tight">{mode === "day" ? selectedDate.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }) : mode === "week" ? `Semana de ${mondayFor(selectedDate).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}` : monthLabel}</h2><p className="mt-1 text-sm text-fg-muted">Selecione uma data para abrir a agenda</p></div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-full border border-line bg-canvas p-1" aria-label="Visualização do calendário">{([{ id: "month", label: "Mês" }, { id: "week", label: "Semana" }, { id: "day", label: "Dia" }] as const).map((option) => <button key={option.id} onClick={() => setMode(option.id)} aria-pressed={mode === option.id} className={`rounded-full px-3 py-1.5 text-sm transition ${mode === option.id ? "bg-accent text-fg-on-accent shadow-raised" : "text-fg-muted hover:text-fg-strong"}`}>{option.label}</button>)}</div>
              <button onClick={() => { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(dateKey(today)); }} className="h-9 rounded-full border border-line-2 px-4 text-sm text-fg-muted transition hover:bg-surface-2 hover:text-fg-strong">Hoje</button>
              <button onClick={() => movePeriod(-1)} className="flex size-9 items-center justify-center rounded-full border border-line-2 text-fg-muted hover:bg-surface-2" aria-label="Período anterior"><ArrowLeft className="size-4" /></button>
              <button onClick={() => movePeriod(1)} className="flex size-9 items-center justify-center rounded-full border border-line-2 text-fg-muted hover:bg-surface-2" aria-label="Próximo período"><ArrowRight className="size-4" /></button>
            </div>
          </div>
          {mode !== "day" && <div className="grid grid-cols-7 border-b border-line pb-3">{WEEKDAYS.map((day) => <div key={day} className="text-center text-xs font-medium text-fg-subtle">{day}</div>)}</div>}
          <div className={`grid ${mode === "day" ? "grid-cols-1" : "grid-cols-7"} ${mode === "week" ? "min-h-[480px]" : ""}`}>
            {days.map(({ date, key, inMonth }) => {
              const dayEvents = events.filter((event) => event.date === key).sort((a, b) => a.time.localeCompare(b.time));
              const active = selected === key;
              const isToday = key === dateKey(today);
              return <button key={key} onClick={() => { setSelected(key); setMonth(new Date(date.getFullYear(), date.getMonth(), 1)); }} className={`group relative flex min-w-0 flex-col items-stretch gap-2 border-b border-line p-2 text-left transition sm:p-3 ${mode === "day" ? "min-h-[220px]" : mode === "week" ? "min-h-[380px]" : "min-h-[76px] items-center sm:min-h-[94px] sm:py-4"} ${active ? "bg-accent-soft" : "hover:bg-hover"} ${mode === "month" && !inMonth ? "opacity-35" : ""}`} aria-pressed={active}>
                <span className={`flex ${mode === "day" ? "h-10 w-fit px-3" : "size-8"} items-center justify-center rounded-full text-sm ${active ? "bg-accent font-semibold text-fg-on-accent" : isToday ? "border border-accent text-accent-fg" : "text-fg"}`}>{mode !== "month" && <span className="mr-1 text-fg-muted">{WEEKDAYS[(date.getDay() + 6) % 7]}</span>}{date.getDate()}</span>
                {mode === "month" ? <span className="flex h-1.5 items-center justify-center gap-1">{Array.from({ length: Math.min(dayEvents.length, 3) }, (_, i) => <i key={i} className="size-1.5 rounded-full bg-accent" />)}</span> :
                  <div className="mt-1 space-y-1.5">{dayEvents.slice(0, mode === "day" ? 12 : 4).map((event) => <div key={event.id} className="truncate rounded-lg border border-accent/15 bg-accent-soft px-2 py-1.5 text-xs text-fg-strong"><span className="mr-1.5 text-accent-fg">{event.time}</span>{event.title}</div>)}{dayEvents.length > (mode === "day" ? 12 : 4) && <span className="text-xs text-fg-muted">+{dayEvents.length - (mode === "day" ? 12 : 4)} compromissos</span>}</div>}
              </button>;
            })}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-subtle"><span className="inline-flex items-center gap-2"><i className="size-2 rounded-full bg-accent" /> Compromissos registrados</span><span className="inline-flex items-center gap-2"><span className="size-2 rounded-full border border-accent" /> Hoje</span></div>
        </div>

        <aside className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-raised sm:p-6">
          <div className="border-b border-line pb-5"><div className="eyebrow">Agenda do dia</div><h2 className="mt-2 text-h2 font-medium capitalize tracking-tight">{selectedDate.toLocaleDateString("pt-BR", { weekday: "long" })}</h2><p className="mt-1 text-sm text-fg-muted">{selectedDate.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}</p><div className="mt-4 inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-fg">{agenda.length} {agenda.length === 1 ? "compromisso" : "compromissos"}</div></div>
          <div className="flex-1 py-4">
            {!agenda.length ? <div className="flex h-full min-h-56 flex-col items-center justify-center text-center"><div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-fg-muted"><Sparkles className="size-5" /></div><p className="font-medium text-fg-strong">Dia livre por enquanto</p><p className="mt-1 max-w-[220px] text-sm leading-6 text-fg-muted">Adicione um compromisso e mantenha os próximos passos à vista.</p><button onClick={() => setAdding(true)} className="mt-4 rounded-full border border-line-2 px-4 py-2 text-sm text-fg-strong transition hover:bg-surface-2"><Plus className="mr-1 inline size-3.5" /> Adicionar</button></div> :
              <div className="space-y-3">{agenda.map((event) => <article key={event.id} className="rounded-xl border border-line bg-canvas p-4"><div className="flex items-start gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-fg"><Clock3 className="size-4" /></div><div className="min-w-0 flex-1"><div className="text-xs text-fg-muted">{event.time}</div><h3 className="mt-1 font-medium leading-5 text-fg-strong">{event.title}</h3>{event.notes && <p className="mt-1 text-sm leading-5 text-fg-muted">{event.notes}</p>}{event.projectId && event.projectName && <Link href={`/projects/${event.projectId}`} className="mt-3 inline-flex max-w-full rounded-full bg-identity px-2.5 py-1 text-xs text-accent-fg hover:opacity-80">{event.projectName}</Link>}</div><button disabled={isPending} onClick={() => removeCommitment(event.id)} className="rounded-full p-1 text-fg-subtle hover:bg-surface-2 hover:text-red-500 disabled:opacity-40" aria-label={`Excluir ${event.title}`}><Trash2 className="size-3.5" /></button></div></article>)}</div>}
          </div>
          <p className="border-t border-line pt-4 text-xs leading-5 text-fg-subtle">Sincronizado com sua conta SENTINEL. Seus compromissos ficam disponíveis entre dispositivos.</p>
        </aside>
      </div>
    </section>
  );
}
