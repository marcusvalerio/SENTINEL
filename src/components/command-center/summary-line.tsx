"use client";

import { AnimatedNumber } from "@/components/motion/number";

/** The situation in one sentence — numbers count up once, then stay still. */
export function SummaryLine({ active, attention, commits }: { active: number; attention: number; commits: number }) {
  const n = (v: number) => <AnimatedNumber value={v} className="font-numeric text-fg-strong" />;
  return (
    <p className="max-w-[60ch] text-body text-fg-muted sm:text-[1.0625rem] sm:leading-relaxed">
      {n(active)} {active === 1 ? "projeto ativo" : "projetos ativos"}
      <span className="mx-2 text-fg-subtle">·</span>
      {attention === 0 ? "nada pede sua atenção" : <>{n(attention)} {attention === 1 ? "item pede" : "itens pedem"} sua atenção</>}
      <span className="mx-2 text-fg-subtle">·</span>
      {n(commits)} commits em 30 dias
    </p>
  );
}
