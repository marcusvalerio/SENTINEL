"use client";

import { motion } from "motion/react";
import { SlidersHorizontal } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { Modal } from "@/components/ui/modal";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { PROGRESS_SOURCE_LABELS, type ProgressSource } from "@/domain/project";
import { setProjectProgress } from "@/server/projects/actions";

type Props = { projectId: string; progress: number; source: ProgressSource; features: number; featuresDone: number; milestones: number; milestonesDone: number };

export function ProgressPanel({ projectId, progress, source, features, featuresDone, milestones, milestonesDone }: Props) {
  const [open, setOpen] = useState(false);
  const [draftSource, setDraftSource] = useState<ProgressSource>(source);
  const [value, setValue] = useState(progress);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const detail =
    source === "features"
      ? features === 0
        ? "Nenhuma funcionalidade registrada ainda"
        : `${featuresDone} de ${features} funcionalidades concluídas`
      : source === "milestones"
        ? milestones === 0
          ? "Nenhum milestone definido ainda"
          : `${milestonesDone} de ${milestones} milestones concluídos`
        : "Definido manualmente";

  const save = () =>
    startTransition(async () => {
      const result = await setProjectProgress(projectId, { source: draftSource, value });
      if (result.ok) {
        setOpen(false);
        toast.show({ title: "Progresso atualizado" });
      } else toast.show({ tone: "error", title: "Não foi possível atualizar", description: result.error });
    });

  return (
    <div className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="eyebrow">Progresso do projeto</span>
          <span className="text-caption tracking-normal text-fg-subtle">{PROGRESS_SOURCE_LABELS[source]}</span>
        </div>
        <IconButton
          label="Ajustar progresso"
          size="sm"
          onClick={() => {
            setDraftSource(source);
            setValue(progress);
            setOpen(true);
          }}
        >
          <SlidersHorizontal />
        </IconButton>
      </div>
      <div className="flex items-end gap-3">
        <motion.span
          key={progress}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-numeric font-display text-[2.5rem] leading-none font-medium tracking-[-0.04em] text-fg-strong"
        >
          {progress}
          <span className="ml-0.5 text-h3 text-fg-subtle">%</span>
        </motion.span>
      </div>
      <Progress value={progress} size="md" label="Progresso do projeto" />
      <p className="mt-auto text-body-sm text-fg-muted">{detail}</p>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Como medir o progresso?"
        description="O progresso representa conclusão real — não atividade. Commits nunca contam como avanço automaticamente."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={save} loading={pending}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <FormField label="Fonte do progresso">
            <ChoiceGroup
              columns={3}
              options={[
                { value: "features", label: "Funcionalidades", description: "Escopo, ponderado por prioridade" },
                { value: "milestones", label: "Milestones", description: "Etapas do roadmap" },
                { value: "manual", label: "Manual", description: "Você define o percentual" },
              ]}
              value={draftSource}
              onChange={(v) => v && setDraftSource(v)}
            />
          </FormField>
          {draftSource === "manual" && (
            <FormField label="Percentual concluído">
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-surface-3 accent-[var(--color-accent)]"
                />
                <span className="font-numeric w-12 text-right text-h4 text-fg-strong">{value}%</span>
              </div>
            </FormField>
          )}
        </div>
      </Modal>
    </div>
  );
}
