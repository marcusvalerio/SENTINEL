import type { ProjectStatus } from "./project";
import type { MilestoneStatus } from "./milestones";
import type { SyncStatus } from "./github-activity";
import { STALE_DECISION_DAYS } from "./decisions";

/**
 * Project Health — explainable signals, never a score.
 *
 * Every signal and every attention item carries the reason it exists, built
 * only from data SENTINEL already stores. If an input is missing, the signal
 * says so ("não acompanhado") instead of guessing.
 */

export type SignalState = "good" | "watch" | "risk" | "none";
export type HealthSignal = { key: "development" | "roadmap" | "github" | "finance"; label: string; state: SignalState; value: string; reason: string };

export type AttentionSeverity = "high" | "medium" | "low";
export type AttentionItem = { id: string; projectId: string; projectName: string; severity: AttentionSeverity; title: string; reason: string; href: string };

export type HealthInput = {
  project: { id: string; name: string; status: ProjectStatus; statusChangedAt: Date; lastActivityAt: Date };
  github: { syncStatus: SyncStatus; lastSyncedAt: Date | null; syncError: string | null } | null;
  activity: { commits30d: number; lastCommitAt: Date | null };
  milestones: { id: string; name: string; status: MilestoneStatus; dueOn: string | null }[];
  openDecisions: { id: string; title: string; createdAt: Date }[];
  finance: { estimatedCostCents: number | null; costCents: number | null };
  now: Date;
};

const DAY = 86_400_000;
const days = (from: Date, to: Date) => Math.floor((to.getTime() - from.getTime()) / DAY);
const isoDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
const ACTIVE: ProjectStatus[] = ["idea", "planning", "in_development", "validation", "production"];

export function healthSignals(input: HealthInput): HealthSignal[] {
  const { github, activity, milestones, finance, now } = input;
  const today = isoDay(now);

  let development: HealthSignal;
  if (!github) development = { key: "development", label: "Desenvolvimento", state: "none", value: "Sem repositório", reason: "Nenhum repositório GitHub conectado." };
  else if (activity.lastCommitAt && days(activity.lastCommitAt, now) <= 14)
    development = { key: "development", label: "Desenvolvimento", state: "good", value: "Ativo", reason: `${activity.commits30d} commits nos últimos 30 dias.` };
  else if (activity.lastCommitAt && days(activity.lastCommitAt, now) <= 45)
    development = { key: "development", label: "Desenvolvimento", state: "watch", value: "Calmo", reason: `Último commit há ${days(activity.lastCommitAt, now)} dias.` };
  else development = { key: "development", label: "Desenvolvimento", state: "watch", value: "Parado", reason: activity.lastCommitAt ? `Último commit há ${days(activity.lastCommitAt, now)} dias.` : "Nenhum commit sincronizado." };

  const open = milestones.filter((m) => m.status !== "completed" && m.status !== "cancelled");
  const overdue = open.filter((m) => m.dueOn && m.dueOn < today);
  let roadmap: HealthSignal;
  if (milestones.length === 0) roadmap = { key: "roadmap", label: "Roadmap", state: "none", value: "Não definido", reason: "Nenhum milestone registrado." };
  else if (overdue.length) roadmap = { key: "roadmap", label: "Roadmap", state: "risk", value: "Atrasado", reason: `${overdue.length} milestone${overdue.length > 1 ? "s" : ""} com data prevista vencida.` };
  else if (open.length === 0) roadmap = { key: "roadmap", label: "Roadmap", state: "good", value: "Concluído", reason: "Todos os milestones foram concluídos." };
  else roadmap = { key: "roadmap", label: "Roadmap", state: "good", value: "No prazo", reason: "Nenhum milestone atrasado." };

  let gh: HealthSignal;
  if (!github) gh = { key: "github", label: "GitHub", state: "none", value: "Não conectado", reason: "Conecte um repositório para acompanhar a atividade." };
  else if (github.syncStatus === "error") gh = { key: "github", label: "GitHub", state: "risk", value: "Falha na sincronização", reason: github.syncError ?? "A última sincronização falhou." };
  else if (!github.lastSyncedAt) gh = { key: "github", label: "GitHub", state: "watch", value: "Nunca sincronizado", reason: "O repositório está conectado mas nunca foi sincronizado." };
  else if (days(github.lastSyncedAt, now) > 7) gh = { key: "github", label: "GitHub", state: "watch", value: "Desatualizado", reason: `Última sincronização há ${days(github.lastSyncedAt, now)} dias.` };
  else gh = { key: "github", label: "GitHub", state: "good", value: "Sincronizado", reason: `Sincronizado há ${Math.max(0, days(github.lastSyncedAt, now))} dia(s).` };

  let fin: HealthSignal;
  if (finance.estimatedCostCents === null || finance.costCents === null) fin = { key: "finance", label: "Finanças", state: "none", value: "Não acompanhado", reason: "Custo estimado e custo real não estão ambos registrados." };
  else if (finance.costCents > finance.estimatedCostCents) fin = { key: "finance", label: "Finanças", state: "risk", value: "Acima do previsto", reason: `Custo real ${Math.round((finance.costCents / finance.estimatedCostCents) * 100)}% do estimado.` };
  else fin = { key: "finance", label: "Finanças", state: "good", value: "Saudável", reason: `Custo real ${Math.round((finance.costCents / Math.max(1, finance.estimatedCostCents)) * 100)}% do estimado.` };

  return [development, roadmap, gh, fin];
}

export function attentionItems(input: HealthInput): AttentionItem[] {
  const { project, github, milestones, openDecisions, finance, now } = input;
  const base = `/projects/${project.id}`;
  const items: AttentionItem[] = [];
  const today = isoDay(now);
  const active = ACTIVE.includes(project.status);
  const mk = (id: string, severity: AttentionSeverity, title: string, reason: string, href: string) =>
    items.push({ id: `${project.id}:${id}`, projectId: project.id, projectName: project.name, severity, title, reason, href });

  if (active) {
    for (const m of milestones) {
      if (m.status === "completed" || m.status === "cancelled" || !m.dueOn) continue;
      const delta = Math.round((Date.parse(m.dueOn) - Date.parse(today)) / DAY);
      if (delta < 0) mk(`ms-${m.id}`, "high", `Milestone atrasado: ${m.name}`, `Previsto para ${m.dueOn.split("-").reverse().join("/")}, ${-delta} dia${-delta > 1 ? "s" : ""} atrás.`, `${base}/roadmap#milestone-${m.id}`);
      else if (delta <= 7) mk(`ms-${m.id}`, "medium", `Milestone próximo: ${m.name}`, delta === 0 ? "Vence hoje." : `Vence em ${delta} dia${delta > 1 ? "s" : ""}.`, `${base}/roadmap#milestone-${m.id}`);
    }
    const idle = days(project.lastActivityAt, now);
    if (idle >= 30) mk("idle", "medium", "Projeto sem movimento", `Nenhuma atividade registrada há ${idle} dias.`, base);
  }
  if (github?.syncStatus === "error") mk("sync", "high", "Sincronização do GitHub falhou", github.syncError ?? "Tente sincronizar novamente.", `${base}/github`);
  else if (github?.lastSyncedAt && active && days(github.lastSyncedAt, now) > 7) mk("sync-stale", "low", "Atividade do GitHub desatualizada", `Última sincronização há ${days(github.lastSyncedAt, now)} dias.`, `${base}/github`);
  for (const d of openDecisions) {
    const age = days(d.createdAt, now);
    if (age >= STALE_DECISION_DAYS) mk(`dec-${d.id}`, "medium", `Decisão em aberto: ${d.title}`, `Aguardando há ${age} dias.`, `${base}/decisoes#decision-${d.id}`);
  }
  if (project.status === "paused") {
    const paused = days(project.statusChangedAt, now);
    if (paused >= 60) mk("paused", "low", "Pausado há muito tempo", `Em pausa há ${paused} dias — retomar ou arquivar?`, base);
  }
  if (finance.estimatedCostCents !== null && finance.costCents !== null && finance.costCents > finance.estimatedCostCents) {
    mk("budget", "high", "Custo acima do estimado", `Custo real ${Math.round((finance.costCents / finance.estimatedCostCents) * 100)}% do estimado.`, `${base}/financas`);
  }
  const order: Record<AttentionSeverity, number> = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => order[a.severity] - order[b.severity]);
}
