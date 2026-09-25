import { NotebookPen } from "lucide-react";
import { NoteComposer } from "@/components/project/note-composer";
import { NotesJournal } from "@/components/project/notes-journal";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/surface";
import { NOTE_TYPES, type NoteType } from "@/domain/notes";
import { loadProject } from "@/server/projects/context";
import { getNotes } from "@/server/projects/queries";

export const metadata = { title: "Rubrica" };

export default async function RubricaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const [{ project }, { new: requested }] = await Promise.all([loadProject(params), searchParams]);
  const notes = await getNotes(project.id);
  const defaultType = NOTE_TYPES.includes(requested as NoteType) ? (requested as NoteType) : undefined;

  return (
    <div className="mx-auto flex max-w-[920px] flex-col gap-8">
      <SectionHeader title="Rubrica" description="O diário do projeto: notas, ideias, decisões e dúvidas, na ordem em que aconteceram." />
      <NoteComposer key={requested ?? "composer"} projectId={project.id} startOpen={Boolean(requested)} defaultType={defaultType} />
      {notes.length === 0 ? (
        <EmptyState
          compact
          icon={<NotebookPen />}
          title="Este projeto ainda não possui registros."
          description="Comece pelo que está na sua cabeça agora. A Rubrica guarda a história que o código não conta."
        />
      ) : (
        <NotesJournal
          projectId={project.id}
          notes={notes.map((n) => ({ id: n.id, title: n.title, content: n.content, type: n.type, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString() }))}
        />
      )}
    </div>
  );
}
