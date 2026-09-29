import type { StackItem } from "./stack";
import { PROVENANCE_LABELS } from "./stack";

/**
 * Project brief — what happened in the last days, written as plain sentences.
 *
 * Deterministic on purpose: every sentence is a count SENTINEL already stores.
 * No summarisation model, nothing inferred. When nothing happened, it says so.
 */

export const BRIEF_DAYS = 7;

export type WeekCounts = {
  commits: number;
  notes: number;
  featuresDone: number;
  milestonesDone: number;
  decisions: number;
  events: number;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function weeklyBrief(c: WeekCounts): string[] {
  const lines: string[] = [];
  if (c.featuresDone) lines.push(`${plural(c.featuresDone, "funcionalidade concluída", "funcionalidades concluídas")}.`);
  if (c.milestonesDone) lines.push(`${plural(c.milestonesDone, "milestone concluído", "milestones concluídos")}.`);
  if (c.decisions) lines.push(`${plural(c.decisions, "decisão registrada", "decisões registradas")}.`);
  if (c.notes) lines.push(`${plural(c.notes, "registro novo", "registros novos")} na Rubrica.`);
  if (c.commits) lines.push(`${plural(c.commits, "commit sincronizado", "commits sincronizados")} do GitHub.`);
  return lines;
}

export function isQuietWeek(c: WeekCounts) {
  return c.commits + c.notes + c.featuresDone + c.milestonesDone + c.decisions + c.events === 0;
}

/* -------------------------------------------------------------------------- */
/* AI-ready context                                                             */
/* -------------------------------------------------------------------------- */

export type ProjectContext = {
  name: string;
  type: string;
  status: string;
  summary: string | null;
  goal: string;
  problem: string | null;
  audience: string | null;
  currentFocus: string | null;
  progress: number;
  repository: string | null;
  stack: StackItem[];
  tools: string[];
  openMilestones: { name: string; dueOn: string | null }[];
  nextFeatures: string[];
  recentDecisions: { title: string; decision: string | null }[];
  attention: string[];
};

/**
 * Markdown a person can paste into any assistant. Provenance travels with the
 * stack so an inference is never presented to a model as a fact.
 */
export function projectContextMarkdown(p: ProjectContext): string {
  const out: string[] = [`# ${p.name}`, "", `${p.type} · ${p.status} · progresso ${p.progress}%`];
  if (p.summary) out.push("", p.summary);
  const section = (title: string, body: string[]) => {
    if (body.length) out.push("", `## ${title}`, ...body);
  };
  section("Objetivo", [p.goal]);
  section("Problema", p.problem ? [p.problem] : []);
  section("Público", p.audience ? [p.audience] : []);
  section("Foco atual", p.currentFocus ? [p.currentFocus] : []);
  section("Repositório", p.repository ? [p.repository] : []);
  section(
    "Stack",
    p.stack.map((s) => `- ${s.name} (${PROVENANCE_LABELS[s.provenance].toLowerCase()})`),
  );
  section("Ferramentas", p.tools.length ? [p.tools.join(", ")] : []);
  section(
    "Milestones em aberto",
    p.openMilestones.map((m) => `- ${m.name}${m.dueOn ? ` — previsto para ${m.dueOn}` : ""}`),
  );
  section("Próximas funcionalidades", p.nextFeatures.map((f) => `- ${f}`));
  section(
    "Decisões recentes",
    p.recentDecisions.map((d) => `- ${d.title}${d.decision ? `: ${d.decision}` : ""}`),
  );
  section("Pontos de atenção", p.attention.map((a) => `- ${a}`));
  return out.join("\n").trim() + "\n";
}
