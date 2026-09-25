import type { GithubActivityKind } from "./github-activity";
import { TIMELINE_EVENT_LABELS, type TimelineEventType, type TimelineOrigin, type TimelineSource } from "./timeline";

/**
 * The project history as shown on the timeline: recorded events plus
 * development activity, merged at read time (activity is never copied into
 * the events table, so there is nothing to keep in sync or duplicate).
 */
export type HistoryIcon = TimelineEventType | "commit" | "pull_request" | "pull_request_merged" | "issue" | "issue_closed" | "release_published";

export type HistoryItem = {
  id: string;
  origin: TimelineOrigin;
  icon: HistoryIcon;
  label: string;
  title: string;
  description: string | null;
  occurredAt: Date;
  source: TimelineSource;
  url: string | null;
  /** Manual events can be removed; everything else is recorded history. */
  removable: boolean;
  count?: number;
};

type EventRow = { id: string; type: TimelineEventType; origin: TimelineOrigin; source: TimelineSource; title: string; description: string | null; occurredAt: Date };
type ActivityRow = { id: string; kind: GithubActivityKind; number: number | null; title: string; state: string | null; url: string; occurredAt: Date; closedAt: Date | null; authorLogin: string | null };

function dayOf(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}

export function buildHistory(events: EventRow[], activity: ActivityRow[], { timeZone = "America/Sao_Paulo" } = {}): HistoryItem[] {
  const items: HistoryItem[] = events.map((e) => ({
    id: e.id,
    origin: e.origin,
    icon: e.type,
    label: TIMELINE_EVENT_LABELS[e.type],
    title: e.title,
    description: e.description,
    occurredAt: e.occurredAt,
    source: e.source,
    url: null,
    removable: e.source === "manual",
  }));

  // Commits: one entry per day, the latest commit representing the group.
  const commitsByDay = new Map<string, ActivityRow[]>();
  for (const a of activity) {
    if (a.kind === "commit") {
      const key = dayOf(a.occurredAt, timeZone);
      commitsByDay.set(key, [...(commitsByDay.get(key) ?? []), a]);
    }
  }
  for (const [day, commits] of commitsByDay) {
    commits.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
    const latest = commits[0]!;
    const authors = [...new Set(commits.map((c) => c.authorLogin).filter(Boolean))];
    items.push({
      id: `commits-${day}`,
      origin: "development",
      icon: "commit",
      label: commits.length === 1 ? "Commit" : "Commits",
      title: commits.length === 1 ? latest.title : `${commits.length} commits`,
      description: commits.length === 1 ? (authors[0] ? `por ${authors[0]}` : null) : commits.slice(0, 3).map((c) => `· ${c.title}`).join("\n") + (commits.length > 3 ? `\n· e mais ${commits.length - 3}` : ""),
      occurredAt: latest.occurredAt,
      source: "github",
      url: commits.length === 1 ? latest.url : null,
      removable: false,
      count: commits.length,
    });
  }

  for (const a of activity) {
    const ref = a.number ? `#${a.number} ` : "";
    if (a.kind === "pull_request") {
      items.push({ id: `${a.id}-opened`, origin: "development", icon: "pull_request", label: "Pull request aberto", title: `${ref}${a.title}`, description: a.authorLogin ? `por ${a.authorLogin}` : null, occurredAt: a.occurredAt, source: "github", url: a.url, removable: false });
      if (a.state === "merged" && a.closedAt) {
        items.push({ id: `${a.id}-merged`, origin: "development", icon: "pull_request_merged", label: "Pull request integrado", title: `${ref}${a.title}`, description: null, occurredAt: a.closedAt, source: "github", url: a.url, removable: false });
      }
    } else if (a.kind === "issue") {
      items.push({ id: `${a.id}-opened`, origin: "development", icon: "issue", label: "Issue aberta", title: `${ref}${a.title}`, description: a.authorLogin ? `por ${a.authorLogin}` : null, occurredAt: a.occurredAt, source: "github", url: a.url, removable: false });
      if (a.state === "closed" && a.closedAt) {
        items.push({ id: `${a.id}-closed`, origin: "development", icon: "issue_closed", label: "Issue fechada", title: `${ref}${a.title}`, description: null, occurredAt: a.closedAt, source: "github", url: a.url, removable: false });
      }
    } else if (a.kind === "release") {
      items.push({ id: a.id, origin: "development", icon: "release_published", label: a.state === "prerelease" ? "Pré-release" : "Release publicada", title: a.title, description: null, occurredAt: a.occurredAt, source: "github", url: a.url, removable: false });
    }
  }

  return items.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
}
