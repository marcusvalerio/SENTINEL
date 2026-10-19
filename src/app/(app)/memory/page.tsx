import type { Metadata } from "next";
import Link from "next/link";
import { Brain, FileText, ArrowUpRight } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { Reveal } from "@/components/motion/reveal";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { projectNotes, projects } from "@/server/db/schema";

export const metadata: Metadata = { title: "Memória" };

export default async function MemoryPage() {
  const user = await requireUser();
  const notes = await db
    .select({
      id: projectNotes.id,
      title: projectNotes.title,
      content: projectNotes.content,
      type: projectNotes.type,
      tags: projectNotes.tags,
      updatedAt: projectNotes.updatedAt,
      projectId: projects.id,
      projectName: projects.name,
    })
    .from(projectNotes)
    .innerJoin(projects, eq(projectNotes.projectId, projects.id))
    .where(eq(projects.ownerId, user.id))
    .orderBy(desc(projectNotes.updatedAt))
    .limit(200);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <Reveal className="flex flex-col gap-3">
        <p className="eyebrow flex items-center gap-2"><Brain className="size-3.5" /> Conhecimento acumulado</p>
        <h1 className="text-display font-medium tracking-[-0.045em]">Memória.</h1>
        <p className="max-w-[62ch] text-body text-fg-muted">Decisões, aprendizados e registros dos projetos — preservados em um lugar só, para você não precisar reconstruir o contexto toda vez.</p>
      </Reveal>

      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-4">
        <div><p className="font-display text-h2 font-medium text-fg-strong">{notes.length}</p><p className="text-sm text-fg-muted">registros recentes</p></div>
        <p className="max-w-md text-sm text-fg-subtle">A memória é alimentada pela Rubrica de cada projeto. Abra um registro para continuar de onde parou.</p>
      </div>

      {notes.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {notes.map((note) => (
            <Link key={note.id} href={`/projects/${note.projectId}`} className="group flex min-h-52 flex-col rounded-2xl border border-line bg-surface p-5 shadow-raised transition duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:bg-surface-2">
              <div className="flex items-start justify-between gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent-fg"><FileText className="size-4" /></span><ArrowUpRight className="size-4 text-fg-subtle transition group-hover:text-accent-fg" /></div>
              <p className="mt-4 text-xs text-fg-muted">{note.projectName} <span className="mx-1.5 text-fg-subtle">·</span> {note.type}</p>
              <h2 className="mt-1 font-medium leading-6 text-fg-strong">{note.title}</h2>
              <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-fg-muted">{note.content || "Registro sem conteúdo adicional."}</p>
              {note.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{note.tags.slice(0, 4).map((tag) => <span key={tag} className="rounded-full border border-line px-2 py-1 text-[11px] text-fg-subtle">{tag}</span>)}</div>}
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong px-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-fg-muted"><Brain className="size-5" /></div>
          <h2 className="mt-4 font-medium text-fg-strong">Sua memória começa com um registro.</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-fg-muted">Adicione decisões, aprendizados e notas na Rubrica de um projeto. Eles aparecerão aqui, reunidos em uma visão transversal.</p>
          <Link href="/projects" className="mt-5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-fg-on-accent">Explorar projetos</Link>
        </div>
      )}
    </div>
  );
}
