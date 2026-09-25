"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { MANUAL_TIMELINE_EVENT_TYPES, TIMELINE_EVENT_LABELS } from "@/domain/timeline";
import { dayKey } from "@/lib/format";
import { addTimelineEvent, deleteTimelineEvent, type TimelineEventInput } from "@/server/timeline/actions";

export function AddTimelineEvent({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<TimelineEventInput>({ type: "milestone", title: "", description: "", occurredOn: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const openModal = () => {
    setValues({ type: "milestone", title: "", description: "", occurredOn: dayKey(new Date()) });
    setErrors({});
    setOpen(true);
  };

  const submit = () =>
    startTransition(async () => {
      const result = await addTimelineEvent(projectId, values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) toast.show({ tone: "error", title: "Não foi possível registrar", description: result.error });
        return;
      }
      setOpen(false);
      toast.show({ title: "Evento registrado na timeline" });
    });

  return (
    <>
      <Button variant="secondary" size="sm" leading={<Plus />} onClick={openModal}>
        Registrar evento
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Registrar evento"
        description="Marcos, entregas e decisões que fazem parte da história do projeto."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={submit} loading={pending}>
              Registrar
            </Button>
          </>
        }
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Tipo" error={errors.type}>
              <Select value={values.type} onChange={(e) => setValues((v) => ({ ...v, type: e.target.value as TimelineEventInput["type"] }))}>
                {MANUAL_TIMELINE_EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TIMELINE_EVENT_LABELS[t]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Data" error={errors.occurredOn}>
              <Input type="date" value={values.occurredOn} onChange={(e) => setValues((v) => ({ ...v, occurredOn: e.target.value }))} className="font-numeric" />
            </FormField>
          </div>
          <FormField label="O que aconteceu" required error={errors.title}>
            <Input value={values.title} onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))} placeholder="Ex.: Primeiro protótipo validado com o time de operações" data-autofocus />
          </FormField>
          <FormField label="Detalhes" optional error={errors.description}>
            <Textarea value={values.description ?? ""} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} minRows={3} />
          </FormField>
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>
      </Modal>
    </>
  );
}

export function DeleteTimelineEvent({ projectId, eventId, title }: { projectId: string; eventId: string; title: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  return (
    <IconButton
      label={`Remover “${title}”`}
      size="sm"
      tone="danger"
      disabled={pending}
      className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100"
      onClick={() =>
        startTransition(async () => {
          const result = await deleteTimelineEvent(projectId, eventId);
          toast.show(result.ok ? { title: "Evento removido" } : { tone: "error", title: "Não foi possível remover", description: result.error });
        })
      }
    >
      <Trash2 />
    </IconButton>
  );
}
