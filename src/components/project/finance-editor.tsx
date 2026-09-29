"use client";

import { Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/choice";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { DEFAULT_AI_BASE_MONTHS } from "@/domain/subscriptions";
import { centsToInput } from "@/lib/format";
import { saveProjectFinance } from "@/server/projects/finance-actions";

type Values = { estimatedCost: number | null; actualCost: number | null; revenue: number | null; contractedValue: number | null; aiBaseMonths: number | null };

export function FinanceEditor({ projectId, values, aiBaseServices }: { projectId: string; values: Values; aiBaseServices: string[] }) {
  const initial = () => ({
    estimatedCost: centsToInput(values.estimatedCost),
    actualCost: centsToInput(values.actualCost),
    revenue: centsToInput(values.revenue),
    contractedValue: centsToInput(values.contractedValue),
    applyAi: values.aiBaseMonths !== null,
    months: String(values.aiBaseMonths ?? DEFAULT_AI_BASE_MONTHS),
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, start] = useTransition();
  const toast = useToast();

  const save = () =>
    start(async () => {
      const months = Number.parseInt(form.months, 10);
      const result = await saveProjectFinance(projectId, {
        estimatedCost: form.estimatedCost,
        actualCost: form.actualCost,
        revenue: form.revenue,
        contractedValue: form.contractedValue,
        aiBaseMonths: form.applyAi ? (Number.isFinite(months) ? months : DEFAULT_AI_BASE_MONTHS) : null,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.show({ tone: "error", title: result.error });
        return;
      }
      setErrors({});
      setOpen(false);
      toast.show({ title: "Finanças atualizadas" });
    });

  const money = (key: "estimatedCost" | "actualCost" | "revenue" | "contractedValue", label: string, hint?: string) => (
    <FormField label={label} optional hint={hint} error={errors[key]}>
      <Input inputMode="decimal" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder="0,00" />
    </FormField>
  );

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        leading={<Pencil />}
        onClick={() => {
          setForm(initial());
          setOpen(true);
        }}
      >
        Editar números
      </Button>
      <Modal
        open={open}
        onClose={() => !saving && setOpen(false)}
        title="Economia do projeto"
        description="Tudo é opcional. Os indicadores só aparecem quando os valores por trás deles existem."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={save} loading={saving}>
              Salvar
            </Button>
          </>
        }
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            {money("estimatedCost", "Custo estimado")}
            {money("actualCost", "Custo real", "O que já foi gasto diretamente no projeto.")}
            {money("revenue", "Receita", "O que o projeto já trouxe.")}
            {money("contractedValue", "Valor do contrato", "Usado quando ainda não há receita.")}
          </div>
          <div className="flex flex-col gap-3 border-t border-line pt-5">
            <Switch
              checked={form.applyAi}
              onCheckedChange={(applyAi) => setForm({ ...form, applyAi })}
              label="Somar a base de IA ao custo"
              description={aiBaseServices.length ? `${aiBaseServices.join(" + ")}, pelo número de meses abaixo.` : "Nenhuma assinatura marcada como base de IA ainda."}
            />
            {form.applyAi && (
              <FormField label="Meses de base de IA" error={errors.aiBaseMonths}>
                <Input type="number" min={1} max={60} value={form.months} onChange={(e) => setForm({ ...form, months: e.target.value })} className="w-28" />
              </FormField>
            )}
          </div>
        </form>
      </Modal>
    </>
  );
}
