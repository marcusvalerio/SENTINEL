import "server-only";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { cache } from "react";
import type { GithubActivityKind } from "@/domain/github-activity";
import { buildHistory } from "@/domain/history";
import type { TimelineOrigin } from "@/domain/timeline";
import { db } from "@/server/db/client";
import { githubActivity, projectMilestones, projectTimelineEvents } from "@/server/db/schema";

/**
 * Read models for Phase 2 intelligence. Every function takes a project id
 * that the caller has ALREADY authorized (loadProject / ownedProjectId).
 */

export const getMilestones = cache((projectId: string) =>
  db.select().from(projectMilestones).where(eq(projectMilestones.projectId, projectId)).orderBy(asc(projectMilestones.position), asc(projectMilestones.createdAt)),
);

export function getActivity(projectId: string, kind?: GithubActivityKind, limit = 50) {
  return db
    .select()
    .from(githubActivity)
    .where(and(eq(githubActivity.projectId, projectId), kind ? eq(githubActivity.kind, kind) : undefined))
    .orderBy(desc(githubActivity.occurredAt))
    .limit(limit);
}

/** Headline development numbers. These describe activity — never completion. */
export const getActivityStats = cache(async (projectId: string) => {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [row] = await db
    .select({
      commits30d: sql<number>`count(*) filter (where ${githubActivity.kind} = 'commit' and ${githubActivity.occurredAt} >= ${since.toISOString()})::int`,
      commitsTotal: sql<number>`count(*) filter (where ${githubActivity.kind} = 'commit')::int`,
      openPulls: sql<number>`count(*) filter (where ${githubActivity.kind} = 'pull_request' and ${githubActivity.state} in ('open', 'draft'))::int`,
      mergedPulls: sql<number>`count(*) filter (where ${githubActivity.kind} = 'pull_request' and ${githubActivity.state} = 'merged')::int`,
      openIssues: sql<number>`count(*) filter (where ${githubActivity.kind} = 'issue' and ${githubActivity.state} = 'open')::int`,
      releases: sql<number>`count(*) filter (where ${githubActivity.kind} = 'release')::int`,
      lastCommitAt: sql<string | null>`max(${githubActivity.occurredAt}) filter (where ${githubActivity.kind} = 'commit')`,
      lastActivityAt: sql<string | null>`max(greatest(${githubActivity.occurredAt}, coalesce(${githubActivity.closedAt}, ${githubActivity.occurredAt})))`,
    })
    .from(githubActivity)
    .where(eq(githubActivity.projectId, projectId));
  return {
    commits30d: row?.commits30d ?? 0,
    commitsTotal: row?.commitsTotal ?? 0,
    openPulls: row?.openPulls ?? 0,
    mergedPulls: row?.mergedPulls ?? 0,
    openIssues: row?.openIssues ?? 0,
    releases: row?.releases ?? 0,
    lastCommitAt: row?.lastCommitAt ? new Date(row.lastCommitAt) : null,
    lastActivityAt: row?.lastActivityAt ? new Date(row.lastActivityAt) : null,
  };
});

/** Commits per day over the last `days` days, oldest first (for the activity strip). */
export async function getCommitCadence(projectId: string, days = 30) {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);
  const rows = await db
    .select({ day: sql<string>`to_char(${githubActivity.occurredAt} at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')`, count: sql<number>`count(*)::int` })
    .from(githubActivity)
    .where(and(eq(githubActivity.projectId, projectId), eq(githubActivity.kind, "commit"), gte(githubActivity.occurredAt, since)))
    .groupBy(sql`1`);
  const map = new Map(rows.map((r) => [r.day, r.count]));
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  return Array.from({ length: days }, (_, i) => {
    const day = fmt.format(new Date(Date.now() - (days - 1 - i) * 24 * 3600 * 1000));
    return { day, count: map.get(day) ?? 0 };
  });
}

export async function getHistory(projectId: string, origin?: TimelineOrigin) {
  const includeDevelopment = !origin || origin === "development";
  const [events, activity] = await Promise.all([
    db
      .select()
      .from(projectTimelineEvents)
      .where(and(eq(projectTimelineEvents.projectId, projectId), origin ? eq(projectTimelineEvents.origin, origin) : undefined))
      .orderBy(desc(projectTimelineEvents.occurredAt))
      .limit(400),
    includeDevelopment
      ? db
          .select({
            id: githubActivity.id,
            kind: githubActivity.kind,
            number: githubActivity.number,
            title: githubActivity.title,
            state: githubActivity.state,
            url: githubActivity.url,
            occurredAt: githubActivity.occurredAt,
            closedAt: githubActivity.closedAt,
            authorLogin: githubActivity.authorLogin,
          })
          .from(githubActivity)
          .where(eq(githubActivity.projectId, projectId))
          .orderBy(desc(githubActivity.occurredAt))
          .limit(400)
      : Promise.resolve([]),
  ]);
  return buildHistory(events, activity);
}

export async function getOriginCounts(projectId: string) {
  const rows = await db
    .select({ origin: projectTimelineEvents.origin, count: sql<number>`count(*)::int` })
    .from(projectTimelineEvents)
    .where(eq(projectTimelineEvents.projectId, projectId))
    .groupBy(projectTimelineEvents.origin);
  return Object.fromEntries(rows.map((r) => [r.origin, r.count])) as Partial<Record<TimelineOrigin, number>>;
}
