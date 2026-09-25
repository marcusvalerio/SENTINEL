"use client";

import { MoreHorizontal, PencilLine, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { deleteProject } from "@/server/projects/actions";

export function ProjectActions({ projectId, name }: { projectId: string; name: string }) {
  const router = useRouter();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      const result = await deleteProject(projectId, confirmation);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.show({ title: "Projeto excluído", description: `${name} e todo o seu histórico foram removidos.` });
      router.push("/");
    });

  return (
    <div className="flex items-center gap-2">
      <ButtonLink href={`/projects/${projectId}/edit`} variant="secondary" size="sm" leading={<PencilLine />}>
        Editar
      </ButtonLink>
      <Dropdown
        width={220}
        trigger={({ ref, toggle, ...aria }) => (
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            {...aria}
            aria-label="Mais ações"
            className="flex size-8 items-center justify-center rounded-sm text-fg-muted shadow-[inset_0_0_0_1px_var(--color-line-2)] transition-colors hover:bg-surface-2 hover:text-fg-strong"
          >
            <MoreHorizontal className="size-4" />
          </button>
        )}
        items={[
          { label: "Editar registro", icon: <PencilLine />, onSelect: () => router.push(`/projects/${projectId}/edit`) },
          { type: "separator" },
          {
            label: "Excluir projeto",
            icon: <Trash2 />,
            tone: "danger",
            onSelect: () => {
              setConfirmation("");
              setError(null);
              setConfirmOpen(true);
            },
          },
        ]}
      />
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        role="alertdialog"
        size="sm"
        title="Excluir projeto?"
        description={
          <>
            Isso apaga <span className="text-fg-strong">{name}</span> com toda a Rubrica, timeline, escopo e conexões. Não pode ser desfeito. Se quiser apenas guardá-lo, prefira arquivar.
          </>
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={remove} loading={pending} disabled={confirmation.trim() !== name}>
              Excluir definitivamente
            </Button>
          </>
        }
      >
        <FormField label={<>Digite <span className="font-mono text-fg-strong">{name}</span> para confirmar</>} error={error}>
          <Input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" data-autofocus />
        </FormField>
      </Modal>
    </div>
  );
}
