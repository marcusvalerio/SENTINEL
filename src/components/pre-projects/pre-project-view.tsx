"use client";

import { PencilLine, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { PRE_PROJECT_CHAPTERS, type PreProjectField } from "@/domain/pre-projects";
import { deletePreProject } from "@/server/pre-projects/actions";
import { PreProjectQuestionnaire } from "./questionnaire";

type Values = Record<"title" | PreProjectField, string>;

export function PreProjectView({ id, values }: { id: string; values: Values }) {
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (editing) return <PreProjectQuestionnaire id={id} initial={values} onSaved={() => { setEditing(false); router.refresh(); }} />;

  return (
    <div className="flex flex-col gap-12">
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" leading={<PencilLine />} onClick={() => setEditing(true)}>
          Editar respostas
        </Button>
        <Button variant="ghost" size="sm" leading={<Trash2 />} onClick={() => setConfirm(true)}>
          Excluir
        </Button>
      </div>
      {PRE_PROJECT_CHAPTERS.map((chapter) => {
        const fields = chapter.fields.filter((f) => f.key !== "title");
        const answered = fields.filter((f) => values[f.key]?.trim());
        return (
          <section key={chapter.key} className="grid gap-4 border-t border-line pt-7 md:grid-cols-[200px_minmax(0,1fr)] md:gap-10">
            <h2 className="font-display text-h4 font-medium text-fg-strong">{chapter.title}</h2>
            {answered.length === 0 ? (
              <button type="button" onClick={() => setEditing(true)} className="w-fit text-left text-body-sm text-fg-subtle italic hover:text-fg">
                Ainda sem respostas — responder agora
              </button>
            ) : (
              <dl className="grid gap-6 sm:grid-cols-2">
                {fields.map((f) =>
                  values[f.key]?.trim() ? (
                    <div key={f.key} className={f.long ? "sm:col-span-2" : undefined}>
                      <dt className="eyebrow mb-1.5">{f.label}</dt>
                      <dd className="prose-reading whitespace-pre-line">{values[f.key]}</dd>
                    </div>
                  ) : null,
                )}
              </dl>
            )}
          </section>
        );
      })}
      <p className="text-caption tracking-normal text-fg-subtle">
        Perguntas sem resposta ficam ocultas. <Link href="#" onClick={(e) => { e.preventDefault(); setEditing(true); }} className="text-fg-muted underline-offset-2 hover:underline">Completar a descoberta</Link>
      </p>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        loading={pending}
        onConfirm={() =>
          startTransition(async () => {
            await deletePreProject(id);
            router.push("/pre-projects");
          })
        }
        title="Excluir pré-projeto?"
        description={`“${values.title}” e todas as respostas serão apagados. Se quiser apenas guardar, use “Arquivado”.`}
        confirmLabel="Excluir"
      />
    </div>
  );
}
