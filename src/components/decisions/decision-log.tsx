"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, MoreHorizontal, Pencil, Plus, Scale, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice";
import { Dropdown } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { DECISION_STATUSES, DECISION_STATUS_LABELS, EMPTY_DECISION, type DecisionInput, type DecisionStatus } from "@/domain/decisions";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { createDecision, deleteDecision, setDecisionStatus, updateDecision } from "@/server/decisions/actions";

export type Decision = {
  id: string;
  title: string;
  context: string | null;
  problem: string | null;
  alternatives: string | null;
  decision: string | null;
  impact: string | null;
  status: DecisionStatus;
  decidedOn: string | null;
  createdAt: string;
  fromNote: boolean;
};

const TONE: Record<DecisionStatus, "gold" | "success" | "neutral" | "danger"> = { proposed: "gold", decided: "success", superseded: "neutral", reverted: "danger" };

const FIELDS: { key: "context" | "problem" | "alternatives" | "decision" | "impact"; label: string; hint: string }[] = [
  { key: "context", label: "Contexto", hint: "O que está acontecendo que exige uma decisão?" },
  { key: "problem", label: "Problema", hint: "Qual é exatamente a questão a resolver?" },
  { key: "alternatives", label: "Alternativas", hint: "Quais caminhos foram considerados?" },
  { key: "decision", label: "Decisão", hint: "O que foi escolhido — e por quê." },
  { key: "impact", label: "Impacto", hint: "O que muda no projeto a partir daqui?" },
];

const toInput = (d: Decision): DecisionInput => ({
  title: d.title,
  context: d.context ?? "",
  problem: d.problem ?? "",
  alternatives: d.alternatives ?? "",
  decision: d.decision ?? "",
  impact: d.impact ?? "",
  status: d.status,
  decidedOn: d.decidedOn ?? "",
});

export function DecisionLog({ projectId, decisions }: { projectId: string; decisions: Decision[] }) {
  const [editing, setEditing] = useState<{ id: string | null; values: DecisionInput } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<Decision | null>(null);
  const [saving, startSaving] = useTransition();
  const [, startTransition] = useTransition();
  const toast = useToast();

  const open = decisions.filter((d) => d.status === "proposed");
  const record = decisions.filter((d) => d.status !== "proposed");

  const save = () =>
    startSaving(async () => {
      if (!editing) return;
      const result = editing.id ? await updateDecision(projectId, editing.id, editing.values) : await createDecision(projectId, editing.values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.show({ tone: "error", title: result.error });
        return;
      }
      toast.show({ title: editing.id ? "Decisão atualizada" : "Decisão registrada", description: "A linha do tempo foi atualizada." });
      setEditing(null);
      setErrors({});
    });

  const setStatus = (d: Decision, status: DecisionStatus) =>
    startTransition(async () => {
      const result = await setDecisionStatus(projectId, d.id, status);
      toast.show(result.ok ? { title: `Marcada como ${DECISION_STATUS_LABELS[status].toLowerCase()}` } : { tone: "error", title: result.error });
    });

  const remove = () =>
    startTransition(async () => {
      if (!confirm) return;
      const result = await deleteDecision(projectId, confirm.id);
      toast.show(result.ok ? { title: "Decisão removida" } : { tone: "error", title: result.error });
      setConfirm(null);
    });

  const actions = (d: Decision) => (
    <Dropdown
      width={210}
      trigger={({ ref, toggle, ...aria }) => (
        <button ref={ref} type="button" onClick={toggle} {...aria} aria-label={`Ações para ${d.title}`} className="flex size-7 shrink-0 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg-strong">
          <MoreHorizontal className="size-4" />
        </button>
      )}
      items={[
        { label: "Editar", icon: <Pencil />, onSelect: () => setEditing({ id: d.id, values: toInput(d) }) },
        { type: "separator" as const },
        { type: "label" as const, label: "Status" },
        ...DECISION_STATUSES.map((s) => ({ label: DECISION_STATUS_LABELS[s], selected: d.status === s, onSelect: () => setStatus(d, s) })),
        { type: "separator" as const },
        { label: "Remover", icon: <Trash2 />, tone: "danger" as const, onSelect: () => setConfirm(d) },
      ]}
    />
  );

  return (
    <div className="flex flex-col gap-12">
      <div className="flex items-center justify-between gap-4">
        <p className="max-w-[60ch] text-body-sm text-fg-muted">Cada decisão guarda o contexto, as alternativas e o impacto — para que daqui a seis meses o &ldquo;por quê&rdquo; ainda esteja aqui.</p>
        <Button variant="primary" size="sm" leading={<Plus />} onClick={() => setEditing({ id: null, values: { ...EMPTY_DECISION } })}>
          Nova decisão
        </Button>
      </div>

      {decisions.length === 0 ? (
        <EmptyState
          icon={<Scale />}
          title="Nenhuma decisão registrada."
          description="Registre escolhas de arquitetura, produto ou negócio. Anotações do tipo Decisão na Rubrica também podem virar decisões."
        />
      ) : (
        <>
          {open.length > 0 && (
            <section className="flex flex-col gap-3" aria-labelledby="open-decisions">
              <h2 id="open-decisions" className="eyebrow">
                Em aberto · {open.length}
              </h2>
              <ul className="flex flex-col divide-y divide-line border-y border-line">
                {open.map((d) => (
                  <DecisionRow key={d.id} decision={d} actions={actions(d)} onDecide={() => setEditing({ id: d.id, values: { ...toInput(d), status: "decided" } })} />
                ))}
              </ul>
            </section>
          )}
          {record.length > 0 && (
            <section className="flex flex-col gap-3" aria-labelledby="decision-record">
              <h2 id="decision-record" className="eyebrow">
                Registro de decisões
              </h2>
              <ul className="flex flex-col divide-y divide-line border-y border-line">
                {record.map((d) => (
                  <DecisionRow key={d.id} decision={d} actions={actions(d)} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <Modal
        open={!!editing}
        onClose={() => !saving && setEditing(null)}
        size="lg"
        title={editing?.id ? "Editar decisão" : "Nova decisão"}
        description="Só o título é obrigatório. Preencha o resto quando fizer sentido."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={save} loading={saving}>
              {editing?.id ? "Salvar" : "Registrar decisão"}
            </Button>
          </>
        }
      >
        {editing && (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <FormField label="Título" required error={errors.title}>
              <Input value={editing.values.title} autoFocus maxLength={200} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, title: e.target.value } })} placeholder="Ex.: Usar PostgreSQL no Neon" />
            </FormField>
            <FormField label="Status">
              <ChoiceGroup
                columns={4}
                size="sm"
                aria-label="Status da decisão"
                value={editing.values.status}
                onChange={(status) => status && setEditing({ ...editing, values: { ...editing.values, status } })}
                options={DECISION_STATUSES.map((s) => ({ value: s, label: DECISION_STATUS_LABELS[s] }))}
              />
            </FormField>
            {FIELDS.map((f) => (
              <FormField key={f.key} label={f.label} hint={f.hint} optional error={errors[f.key]}>
                <Textarea minRows={2} value={editing.values[f.key] ?? ""} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, [f.key]: e.target.value } })} />
              </FormField>
            ))}
            <FormField label="Data da decisão" optional hint="Preenchida automaticamente ao marcar como decidida." error={errors.decidedOn}>
              <Input type="date" value={editing.values.decidedOn ?? ""} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, decidedOn: e.target.value } })} className="w-fit" />
            </FormField>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        title="Remover esta decisão?"
        description="O registro some da lista. Os eventos já gravados na linha do tempo permanecem."
        confirmLabel="Remover"
      />
    </div>
  );
}

function DecisionRow({ decision: d, actions, onDecide }: { decision: Decision; actions: React.ReactNode; onDecide?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const details = FIELDS.filter((f) => f.key !== "decision" && d[f.key]);
  return (
    <li id={`decision-${d.id}`} className="flex flex-col gap-3 py-5">
      <div className="flex items-start gap-4">
        <span className="font-numeric hidden w-24 shrink-0 pt-0.5 text-caption tracking-normal text-fg-subtle sm:inline">
          {formatDate(d.decidedOn ?? d.createdAt, "numeric")}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={cn("text-body font-medium", d.status === "superseded" || d.status === "reverted" ? "text-fg-muted" : "text-fg-strong")}>{d.title}</h3>
            <Badge tone={TONE[d.status]}>{DECISION_STATUS_LABELS[d.status]}</Badge>
            {d.fromNote && <span className="text-caption tracking-normal text-fg-subtle">da Rubrica</span>}
          </div>
          {d.decision ? (
            <p className="max-w-[72ch] font-reading text-reading whitespace-pre-line text-fg">{d.decision}</p>
          ) : d.problem || d.context ? (
            <p className="line-clamp-2 max-w-[72ch] text-body-sm text-fg-muted">{d.problem ?? d.context}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {onDecide && (
              <Button size="sm" variant="secondary" onClick={onDecide}>
                Registrar decisão
              </Button>
            )}
            {details.length > 0 && (
              <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="inline-flex items-center gap-1 text-caption tracking-normal text-fg-muted transition-colors hover:text-fg-strong">
                <ChevronDown className={cn("size-3.5 transition-transform duration-200", expanded && "rotate-180")} aria-hidden />
                {expanded ? "Ocultar detalhes" : `${details.map((f) => f.label.toLowerCase()).join(", ")}`}
              </button>
            )}
          </div>
        </div>
        {actions}
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.dl
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-5 overflow-hidden sm:ml-28 sm:grid-cols-2"
          >
            {details.map((f) => (
              <div key={f.key} className="flex flex-col gap-1">
                <dt className="eyebrow">{f.label}</dt>
                <dd className="font-reading text-body whitespace-pre-line text-fg">{d[f.key]}</dd>
              </div>
            ))}
          </motion.dl>
        )}
      </AnimatePresence>
    </li>
  );
}
