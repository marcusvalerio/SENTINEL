"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, Plus, Sparkles, X } from "lucide-react";

type Project = { id: string; name: string; codename: string | null };
type Commitment = { id: string; title: string; date: string; time: string; projectId: string; notes: string };

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromKey = (value: string) => { const parts = value.split("-"); return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])); };

export function CalendarView({ projects }: { projects: Project[] }) {
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(dateKey(today));
  const [events, setEvents] = useState<Commitment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("10:00");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("sentinel-calendar-commitments");
      if (raw) setEvents(JSON.parse(raw) as Commitment[]);
    } catch { /* Ignore malformed local cache and keep the calendar usable. */ }
    setLoaded(true);
  }, []);

  const save = (next: Commitment[]) => {
    setEvents(next);
    window.localStorage.setItem("sentinel-calendar-commitments", JSON.stringify(next));
  };

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return { date, key: dateKey(date), inMonth: date.getMonth() === month.getMonth() };
    });
  }, [month]);

  const agenda = events.filter((event) => event.date === selected).sort((a, b) => a.time.localeCompare(b.time));
  const selectedDate = fromKey(selected);
  const monthLabel = `${MONTHS[month.getMonth()]} de ${month.getFullYear()}`;

  function addCommitment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    save([...events, { id: crypto.randomUUID(), title: title.trim(), date: selected, time, projectId, notes: notes.trim() }]);
    setTitle(""); setNotes(""); setTime("10:00"); setAdding(false);
  }

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-7 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <div className="eyebrow flex items-center gap-2"><CalendarDays className="size-3.5" /> Planejamento</div>
          <h1 className="text-display font-medium tracking-[-0.045em]">Calendário</h1>
          <p className="max-w-xl text-body text-fg-muted">Compromissos, prazos e próximos passos dos seus projetos em um só lugar.</p>
        </div>
        <button onClick={() => setAdding((value) => !value)} className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-full bg-accent px-5 text-sm font-medium text-fg-on-accent shadow-raised transition hover:brightness-105 sm:self-auto"><Plus className="size-4" /> Novo compromisso</button>
      </header>

      {adding && <form onSubmit={addCommitment} className="grid gap-4 rounded-2xl border border-line bg-surface p-5 shadow-raised md:grid-cols-2 xl:grid-cols-[1.5fr_140px_1fr_1.5fr_auto]">
        <label className="grid gap-1.5 text-sm text-fg-muted">Compromisso<input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Revisar entregas da sprint" required className="h-10 rounded-xl border border-line-2 bg-canvas px-3 text-fg-strong outline-none focus:border-accent" /></label>
        <label className="grid gap-1.5 text-sm text-fg-muted">Horário<input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-10 rounded-xl border border-line-2 bg-canvas px-3 text-fg-strong outline-none focus:border-accent" /></label>
        <label className="grid gap-1.5 text-sm text-fg-muted">Projeto<select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-10 rounded-xl border border-line-2 bg-canvas px-3 text-fg-strong outline-none focus:border-accent"><option value="">Sem projeto vinculado</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm text-fg-muted">Observações<input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contexto opcional" className="h-10 rounded-xl border border-line-2 bg-canvas px-3 text-fg-strong outline-none focus:border-accent" /></label>
        <div className="flex items-end gap-2"><button type="submit" className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-fg-on-accent"><Check className="size-4" /> Salvar</button><button type="button" onClick={() => setAdding(false)} className="flex size-10 items-center justify-center rounded-full border border-line-2 text-fg-muted hover:bg-surface-2" aria-label="Cancelar"><X className="size-4" /></button></div>
      </form>}

      <div className="grid min-h-[620px] gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-raised sm:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-h2 font-medium capitalize tracking-tight">{monthLabel}</h2><p className="mt-1 text-sm text-fg-muted">Selecione um dia para ver a agenda</p></div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(dateKey(today)); }} className="h-9 rounded-full border border-line-2 px-4 text-sm text-fg-muted transition hover:bg-surface-2 hover:text-fg-strong">Hoje</button>
              <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="flex size-9 items-center justify-center rounded-full border border-line-2 text-fg-muted hover:bg-surface-2" aria-label="Mês anterior"><ArrowLeft className="size-4" /></button>
              <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="flex size-9 items-center justify-center rounded-full border border-line-2 text-fg-muted hover:bg-surface-2" aria-label="Próximo mês"><ArrowRight className="size-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-line pb-3">{WEEKDAYS.map((day) => <div key={day} className="text-center text-xs font-medium text-fg-subtle">{day}</div>)}</div>
          <div className="grid grid-cols-7">
            {days.map(({ date, key, inMonth }) => {
              const count = events.filter((event) => event.date === key).length;
              const active = selected === key;
              const isToday = key === dateKey(today);
              return <button key={key} onClick={() => { setSelected(key); if (date.getMonth() !== month.getMonth()) setMonth(new Date(date.getFullYear(), date.getMonth(), 1)); }} className={`group relative flex min-h-[76px] flex-col items-center gap-2 border-b border-line py-3 transition sm:min-h-[94px] sm:py-4 ${active ? "bg-accent-soft" : "hover:bg-hover"} ${!inMonth ? "opacity-35" : ""}`} aria-pressed={active}>
                <span className={`flex size-8 items-center justify-center rounded-full text-sm ${active ? "bg-accent font-semibold text-fg-on-accent" : isToday ? "border border-accent text-accent" : "text-fg"}`}>{date.getDate()}</span>
                <span className="flex h-1.5 items-center justify-center gap-1">{Array.from({ length: Math.min(count, 3) }, (_, i) => <i key={i} className="size-1.5 rounded-full bg-accent" />)}</span>
              </button>;
            })}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-subtle"><span className="inline-flex items-center gap-2"><i className="size-2 rounded-full bg-accent" /> Compromissos registrados</span><span className="inline-flex items-center gap-2"><span className="size-2 rounded-full border border-accent" /> Hoje</span></div>
        </div>

        <aside className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-raised sm:p-6">
          <div className="border-b border-line pb-5"><div className="eyebrow">Agenda do dia</div><h2 className="mt-2 text-h2 font-medium capitalize tracking-tight">{selectedDate.toLocaleDateString("pt-BR", { weekday: "long" })}</h2><p className="mt-1 text-sm text-fg-muted">{selectedDate.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}</p><div className="mt-4 inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">{agenda.length} {agenda.length === 1 ? "compromisso" : "compromissos"}</div></div>
          <div className="flex-1 py-4">
            {!agenda.length ? <div className="flex h-full min-h-56 flex-col items-center justify-center text-center"><div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-fg-muted"><Sparkles className="size-5" /></div><p className="font-medium text-fg-strong">Dia livre por enquanto</p><p className="mt-1 max-w-[220px] text-sm leading-6 text-fg-muted">Adicione um compromisso e mantenha os próximos passos à vista.</p><button onClick={() => setAdding(true)} className="mt-4 rounded-full border border-line-2 px-4 py-2 text-sm text-fg-strong transition hover:bg-surface-2"><Plus className="mr-1 inline size-3.5" /> Adicionar</button></div> :
              <div className="space-y-3">{agenda.map((event) => { const project = projects.find((item) => item.id === event.projectId); return <article key={event.id} className="rounded-xl border border-line bg-canvas p-4"><div className="flex items-start gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent"><Clock3 className="size-4" /></div><div className="min-w-0 flex-1"><div className="font-numeric text-xs text-fg-muted">{event.time}</div><h3 className="mt-1 font-medium leading-5 text-fg-strong">{event.title}</h3>{event.notes && <p className="mt-1 text-sm leading-5 text-fg-muted">{event.notes}</p>}{project && <Link href={`/projects/${project.id}`} className="mt-3 inline-flex max-w-full rounded-full bg-identity px-2.5 py-1 text-xs text-accent hover:opacity-80">{project.name}</Link>}</div><button onClick={() => save(events.filter((item) => item.id !== event.id))} className="rounded-full p-1 text-fg-subtle hover:bg-surface-2 hover:text-fg-strong" aria-label={`Excluir ${event.title}`}><X className="size-3.5" /></button></div></article>; })}</div>}
          </div>
          <p className="border-t border-line pt-4 text-xs leading-5 text-fg-subtle">{loaded ? "Seus compromissos ficam salvos neste navegador." : "Carregando compromissos…"}</p>
        </aside>
      </div>
    </section>
  );
}
