"use client";

import { AnimatePresence, motion } from "motion/react";
import { CreditCard, MoreHorizontal, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, ChoiceGroup, Switch } from "@/components/ui/choice";
import { Dropdown } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Input, Select } from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  BILLING_LABELS,
  BILLING_PERIODS,
  EMPTY_SUBSCRIPTION,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_STATUS_LABELS,
  monthlyCents,
  type BillingPeriod,
  type SubscriptionInput,
  type SubscriptionStatus,
} from "@/domain/subscriptions";
import { TOOL_CATEGORIES, TOOL_CATEGORY_LABELS, type ToolCategory } from "@/domain/tools";
import { cn } from "@/lib/cn";
import { centsToInput, formatDate, formatMoney } from "@/lib/format";
import { deleteSubscription, saveSubscription, setSubscriptionStatus } from "@/server/subscriptions/actions";

export type SubscriptionView = {
  id: string;
  service: string;
  plan: string | null;
  billing: BillingPeriod;
  amountCents: number | null;
  currency: string;
  renewsOn: string | null;
  category: ToolCategory | null;
  usage: string | null;
  status: SubscriptionStatus;
  isAiBase: boolean;
  projects: { id: string; name: string }[];
};

/** Suggestions only pre-fill the service — prices are never invented. */
const SUGGESTIONS: { service: string; billing: BillingPeriod; category: ToolCategory; isAiBase: boolean; usage: string }[] = [
  { service: "Claude", billing: "monthly", category: "ai", isAiBase: true, usage: "Desenvolvimento, arquitetura e QA" },
  { service: "ChatGPT", billing: "monthly", category: "ai", isAiBase: true, usage: "Pesquisa e ideação" },
  { service: "v0", billing: "on_demand", category: "ai", isAiBase: false, usage: "Prototipação de interface" },
  { service: "Lovable", billing: "on_demand", category: "ai", isAiBase: false, usage: "Prototipação com IA" },
];

const toInput = (s: SubscriptionView): SubscriptionInput => ({
  service: s.service,
  plan: s.plan ?? "",
  billing: s.billing,
  amount: centsToInput(s.amountCents),
  currency: s.currency as "BRL" | "USD" | "EUR",
  renewsOn: s.renewsOn ?? "",
  category: s.category ?? "",
  usage: s.usage ?? "",
  status: s.status,
  isAiBase: s.isAiBase,
  projectIds: s.projects.map((p) => p.id),
});

export function SubscriptionsBoard({ items, projects }: { items: SubscriptionView[]; projects: { id: string; name: string }[] }) {
  const [editing, setEditing] = useState<{ id: string | null; values: SubscriptionInput } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<SubscriptionView | null>(null);
  const [saving, startSaving] = useTransition();
  const [, start] = useTransition();
  const toast = useToast();

  const existing = new Set(items.map((i) => i.service.toLowerCase()));
  const suggestions = SUGGESTIONS.filter((s) => !existing.has(s.service.toLowerCase()));
  const recurring = items.filter((i) => i.status !== "cancelled" && (i.billing === "monthly" || i.billing === "yearly"));
  const onDemand = items.filter((i) => i.status !== "cancelled" && (i.billing === "on_demand" || i.billing === "one_time"));
  const cancelled = items.filter((i) => i.status === "cancelled");

  const set = (patch: Partial<SubscriptionInput>) => editing && setEditing({ ...editing, values: { ...editing.values, ...patch } });

  const save = () =>
    startSaving(async () => {
      if (!editing) return;
      const result = await saveSubscription(editing.id, editing.values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.show({ tone: "error", title: result.error });
        return;
      }
      toast.show({ title: editing.id ? "Assinatura atualizada" : "Assinatura registrada" });
      setEditing(null);
      setErrors({});
    });

  const row = (s: SubscriptionView) => {
    const monthly = monthlyCents(s);
    return (
      <motion.li key={s.id} layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="group flex items-start gap-4 border-t border-line py-4 first:border-t-0">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setEditing({ id: s.id, values: toInput(s) })} className={cn("text-left text-body font-medium transition-colors hover:text-accent", s.status === "active" ? "text-fg-strong" : "text-fg-muted")}>
              {s.service}
            </button>
            {s.plan && <span className="text-body-sm text-fg-muted">{s.plan}</span>}
            {s.isAiBase && (
              <Badge tone="accent" icon={<Sparkles />}>
                Base de IA
              </Badge>
            )}
            {s.status !== "active" && <Badge>{SUBSCRIPTION_STATUS_LABELS[s.status]}</Badge>}
          </div>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-caption tracking-normal text-fg-subtle">
            <span>{BILLING_LABELS[s.billing]}</span>
            {s.category && <span>{TOOL_CATEGORY_LABELS[s.category]}</span>}
            {s.renewsOn && <span>Renova em {formatDate(s.renewsOn)}</span>}
            {s.usage && <span className="text-fg-muted">{s.usage}</span>}
          </p>
          {s.projects.length > 0 && <p className="text-caption tracking-normal text-fg-muted">{s.projects.map((p) => p.name).join(" · ")}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5 pt-0.5">
          {s.amountCents !== null ? (
            <>
              <span className="font-numeric font-display text-body font-medium text-fg-strong">{formatMoney(s.amountCents, s.currency)}</span>
              {s.billing === "yearly" && monthly !== null && <span className="font-numeric text-caption tracking-normal text-fg-subtle">≈ {formatMoney(monthly, s.currency)}/mês</span>}
            </>
          ) : (
            <span className="text-caption tracking-normal text-fg-subtle">{s.billing === "on_demand" ? "Por uso" : "Valor não informado"}</span>
          )}
        </div>
        <Dropdown
          width={200}
          trigger={({ ref, toggle, ...aria }) => (
            <button ref={ref} type="button" onClick={toggle} {...aria} aria-label={`Ações para ${s.service}`} className="-my-0.5 flex size-7 shrink-0 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg-strong">
              <MoreHorizontal className="size-4" />
            </button>
          )}
          items={[
            { label: "Editar", icon: <Pencil />, onSelect: () => setEditing({ id: s.id, values: toInput(s) }) },
            { type: "separator" as const },
            { type: "label" as const, label: "Status" },
            ...SUBSCRIPTION_STATUSES.map((st) => ({
              label: SUBSCRIPTION_STATUS_LABELS[st],
              selected: s.status === st,
              onSelect: () =>
                start(async () => {
                  const r = await setSubscriptionStatus(s.id, st);
                  if (!r.ok) toast.show({ tone: "error", title: r.error });
                }),
            })),
            { type: "separator" as const },
            { label: "Remover", icon: <Trash2 />, tone: "danger" as const, onSelect: () => setRemoving(s) },
          ]}
        />
      </motion.li>
    );
  };

  const group = (title: string, list: SubscriptionView[]) =>
    list.length > 0 && (
      <section className="flex flex-col gap-2" aria-label={title}>
        <h2 className="eyebrow">{title}</h2>
        <ul className="flex flex-col border-y border-line">
          <AnimatePresence initial={false}>{list.map(row)}</AnimatePresence>
        </ul>
      </section>
    );

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" size="sm" leading={<Plus />} onClick={() => setEditing({ id: null, values: { ...EMPTY_SUBSCRIPTION } })}>
          Nova assinatura
        </Button>
        {suggestions.map((s) => (
          <Button
            key={s.service}
            size="sm"
            variant="ghost"
            leading={<Plus />}
            onClick={() => setEditing({ id: null, values: { ...EMPTY_SUBSCRIPTION, service: s.service, billing: s.billing, category: s.category, isAiBase: s.isAiBase, usage: s.usage } })}
          >
            {s.service}
          </Button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<CreditCard />}
          title="Nenhuma assinatura registrada."
          description="Registre as ferramentas que você paga. Os valores são seus — o SENTINEL nunca preenche preços sozinho."
        />
      ) : (
        <>
          {group("Recorrentes", recurring)}
          {group("Sob demanda e créditos", onDemand)}
          {group("Canceladas", cancelled)}
        </>
      )}

      <Modal
        open={!!editing}
        onClose={() => !saving && setEditing(null)}
        size="lg"
        title={editing?.id ? "Editar assinatura" : "Nova assinatura"}
        description="Só o serviço é obrigatório. Deixe o valor vazio se não souber."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={save} loading={saving}>
              Salvar
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
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Serviço" required error={errors.service}>
                <Input value={editing.values.service} autoFocus maxLength={80} onChange={(e) => set({ service: e.target.value })} placeholder="Ex.: Claude" />
              </FormField>
              <FormField label="Plano" optional error={errors.plan}>
                <Input value={editing.values.plan ?? ""} maxLength={80} onChange={(e) => set({ plan: e.target.value })} placeholder="Ex.: Pro" />
              </FormField>
            </div>
            <FormField label="Periodicidade">
              <ChoiceGroup columns={4} size="sm" aria-label="Periodicidade" value={editing.values.billing} onChange={(billing) => billing && set({ billing })} options={BILLING_PERIODS.map((b) => ({ value: b, label: BILLING_LABELS[b] }))} />
            </FormField>
            <div className="grid gap-5 sm:grid-cols-[1fr_120px_1fr]">
              <FormField label={editing.values.billing === "on_demand" ? "Gasto estimado por mês" : "Valor"} optional error={errors.amount} hint={editing.values.billing === "on_demand" ? "Créditos não entram no custo mensal recorrente." : undefined}>
                <Input inputMode="decimal" value={editing.values.amount} onChange={(e) => set({ amount: e.target.value })} placeholder="0,00" />
              </FormField>
              <FormField label="Moeda">
                <Select value={editing.values.currency} onChange={(e) => set({ currency: e.target.value as "BRL" | "USD" | "EUR" })}>
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </Select>
              </FormField>
              <FormField label="Renovação" optional error={errors.renewsOn}>
                <Input type="date" value={editing.values.renewsOn ?? ""} onChange={(e) => set({ renewsOn: e.target.value })} />
              </FormField>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Categoria" optional>
                <Select value={editing.values.category ?? ""} onChange={(e) => set({ category: e.target.value as ToolCategory | "" })}>
                  <option value="">—</option>
                  {TOOL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {TOOL_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Uso" optional error={errors.usage}>
                <Input value={editing.values.usage ?? ""} maxLength={300} onChange={(e) => set({ usage: e.target.value })} placeholder="Para que você usa" />
              </FormField>
            </div>
            <Switch
              checked={!!editing.values.isAiBase}
              onCheckedChange={(isAiBase) => set({ isAiBase })}
              label="Faz parte da base de IA"
              description="Assinaturas da base de IA entram como custo dos projetos pelo número de meses que você escolher em cada projeto."
            />
            {projects.length > 0 && (
              <FormField label="Projetos que usam" optional>
                <ul className="grid max-h-48 gap-1 overflow-y-auto sm:grid-cols-2">
                  {projects.map((p) => (
                    <li key={p.id}>
                      <Checkbox
                        label={p.name}
                        checked={editing.values.projectIds?.includes(p.id) ?? false}
                        onChange={(e) => set({ projectIds: e.target.checked ? [...(editing.values.projectIds ?? []), p.id] : (editing.values.projectIds ?? []).filter((x) => x !== p.id) })}
                      />
                    </li>
                  ))}
                </ul>
              </FormField>
            )}
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() =>
          start(async () => {
            if (!removing) return;
            const r = await deleteSubscription(removing.id);
            toast.show(r.ok ? { title: "Assinatura removida" } : { tone: "error", title: r.error });
            setRemoving(null);
          })
        }
        title={`Remover ${removing?.service ?? "assinatura"}?`}
        description="Os vínculos com projetos também serão removidos. Para manter o histórico, prefira marcar como cancelada."
        confirmLabel="Remover"
      />
    </div>
  );
}
