"use client";

import { Input } from "@/components/ui/input";
import { centsToInput, parseMoneyToCents } from "@/lib/format";

/** Currency field: free typing, normalised to pt-BR format on blur. */
export function MoneyInput({ value, onChange, placeholder = "0,00", name }: { value: string; onChange: (value: string) => void; placeholder?: string; name?: string }) {
  return (
    <Input
      name={name}
      inputMode="decimal"
      autoComplete="off"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => {
        const cents = parseMoneyToCents(value);
        if (cents !== null && !Number.isNaN(cents)) onChange(centsToInput(cents));
      }}
      leading={<span className="font-mono text-[0.75rem] text-fg-subtle">R$</span>}
      className="font-numeric pl-10"
    />
  );
}
