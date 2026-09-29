import type { ProjectStatus, ProjectType } from "./project";

/**
 * Creation history — how the body of work grew over time.
 *
 * Everything here is a count or a date difference over stored records. When
 * a figure needs data that doesn't exist yet (no completed project, no
 * pre-project), it is null and the UI says so instead of estimating.
 */

export type HistoryProject = {
  id: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  source: "manual" | "github_import" | "pre_project";
  createdAt: Date;
  statusChangedAt: Date;
};

export type HistoryInput = {
  projects: HistoryProject[];
  featuresDone: { completedAt: Date }[];
  notes: { createdAt: Date }[];
  decisions: number;
  preProjects: { total: number; converted: number };
  ideas: { total: number; converted: number };
  now: Date;
};

export type MonthBucket = { key: string; label: string; projects: number; features: number; notes: number };

const monthKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).format(d);
const monthLabel = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", month: "short" }).format(d).replace(".", "");

/** The last `count` calendar months, oldest first, with activity per month. */
export function monthlyBuckets(input: Pick<HistoryInput, "projects" | "featuresDone" | "notes" | "now">, count = 12): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(input.now.getFullYear(), input.now.getMonth() - i, 15);
    buckets.push({ key: monthKey(d), label: monthLabel(d), projects: 0, features: 0, notes: 0 });
  }
  const at = (d: Date) => buckets.find((b) => b.key === monthKey(d));
  for (const p of input.projects) {
    const b = at(p.createdAt);
    if (b) b.projects++;
  }
  for (const f of input.featuresDone) {
    const b = at(f.completedAt);
    if (b) b.features++;
  }
  for (const n of input.notes) {
    const b = at(n.createdAt);
    if (b) b.notes++;
  }
  return buckets;
}

const DAY = 86_400_000;

export function historyInsights(input: HistoryInput) {
  const { projects } = input;
  const completed = projects.filter((p) => p.status === "completed");
  const durations = completed.map((p) => Math.max(0, Math.round((p.statusChangedAt.getTime() - p.createdAt.getTime()) / DAY)));
  const byType = new Map<ProjectType, number>();
  for (const p of projects) byType.set(p.type, (byType.get(p.type) ?? 0) + 1);
  const bySource = { manual: 0, github_import: 0, pre_project: 0 };
  for (const p of projects) bySource[p.source]++;
  const years = new Map<number, HistoryProject[]>();
  for (const p of [...projects].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())) {
    const y = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric" }).format(p.createdAt));
    years.set(y, [...(years.get(y) ?? []), p]);
  }
  const first = projects.reduce<Date | null>((min, p) => (!min || p.createdAt < min ? p.createdAt : min), null);

  return {
    totals: {
      projects: projects.length,
      completed: completed.length,
      featuresDone: input.featuresDone.length,
      notes: input.notes.length,
      decisions: input.decisions,
    },
    since: first,
    medianDaysToComplete: durations.length ? median(durations) : null,
    topTypes: [...byType.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
    bySource,
    preProjectConversion: input.preProjects.total ? Math.round((input.preProjects.converted / input.preProjects.total) * 100) : null,
    ideaConversion: input.ideas.total ? Math.round((input.ideas.converted / input.ideas.total) * 100) : null,
    months: monthlyBuckets(input),
    byYear: [...years.entries()].sort((a, b) => b[0] - a[0]),
  };
}

function median(values: number[]) {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2);
}
