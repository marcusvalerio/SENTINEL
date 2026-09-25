import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { likePattern, normalizeQuery, snippetAround, type SearchGroup, type SearchHit, type SearchResponse } from "@/domain/search";
import { db } from "@/server/db/client";

const PER_GROUP = 6;

type Row = { id: string; title: string; body: string | null; project_id: string; project_name: string; kind: string | null; at: string | null; total: number };

/**
 * Global search across everything the user owns. Every query joins through
 * `projects` and filters by owner_id — results from other users' projects
 * are impossible by construction. Accent-insensitive via unaccent().
 */
export async function globalSearch(ownerId: string, raw: string): Promise<SearchResponse> {
  const query = normalizeQuery(raw);
  if (query.length < 2) return { query, total: 0, groups: [] };
  const p = likePattern(query);
  const match = (col: SQL) => sql`unaccent(coalesce(${col}, '')) ilike unaccent(${p})`;

  const run = async (group: SearchGroup, statement: SQL) => {
    const result = await db.execute<Row>(statement);
    const rows = [...result] as Row[];
    return { group, rows, total: rows[0]?.total ?? 0 };
  };

  const owned = sql`p.owner_id = ${ownerId}`;
  const limit = sql`limit ${PER_GROUP}`;
  const total = sql`count(*) over ()::int as total`;

  const groups = await Promise.all([
    run(
      "projects",
      sql`select p.id, p.name as title, coalesce(p.summary, p.primary_goal) as body, p.id as project_id, p.name as project_name, p.status::text as kind, p.last_activity_at::text as at, ${total}
          from projects p where ${owned} and (${match(sql`p.name`)} or ${match(sql`p.codename`)} or ${match(sql`p.summary`)} or ${match(sql`p.primary_goal`)} or ${match(sql`p.problem`)} or ${match(sql`p.observations`)})
          order by p.last_activity_at desc ${limit}`,
    ),
    run(
      "decisions",
      sql`select n.id, n.title, n.content as body, p.id as project_id, p.name as project_name, n.type::text as kind, n.created_at::text as at, ${total}
          from project_notes n join projects p on p.id = n.project_id
          where ${owned} and n.type = 'decision' and (${match(sql`n.title`)} or ${match(sql`n.content`)} or ${match(sql`array_to_string(n.tags, ' ')`)})
          order by n.created_at desc ${limit}`,
    ),
    run(
      "notes",
      sql`select n.id, n.title, n.content as body, p.id as project_id, p.name as project_name, n.type::text as kind, n.created_at::text as at, ${total}
          from project_notes n join projects p on p.id = n.project_id
          where ${owned} and n.type <> 'decision' and (${match(sql`n.title`)} or ${match(sql`n.content`)} or ${match(sql`array_to_string(n.tags, ' ')`)})
          order by n.created_at desc ${limit}`,
    ),
    run(
      "features",
      sql`select f.id, f.name as title, f.description as body, p.id as project_id, p.name as project_name, f.status::text as kind, f.updated_at::text as at, ${total}
          from project_features f join projects p on p.id = f.project_id
          where ${owned} and (${match(sql`f.name`)} or ${match(sql`f.description`)}) order by f.updated_at desc ${limit}`,
    ),
    run(
      "milestones",
      sql`select m.id, m.name as title, m.description as body, p.id as project_id, p.name as project_name, m.status::text as kind, m.due_on::text as at, ${total}
          from project_milestones m join projects p on p.id = m.project_id
          where ${owned} and (${match(sql`m.name`)} or ${match(sql`m.description`)}) order by m.updated_at desc ${limit}`,
    ),
    run(
      "timeline",
      sql`select e.id, e.title, e.description as body, p.id as project_id, p.name as project_name, e.origin::text as kind, e.occurred_at::text as at, ${total}
          from project_timeline_events e join projects p on p.id = e.project_id
          where ${owned} and (${match(sql`e.title`)} or ${match(sql`e.description`)}) order by e.occurred_at desc ${limit}`,
    ),
    run(
      "activity",
      sql`select a.id, a.title, a.body, p.id as project_id, p.name as project_name, a.kind::text as kind, a.occurred_at::text as at, ${total}
          from github_activity a join projects p on p.id = a.project_id
          where ${owned} and (${match(sql`a.title`)} or ${match(sql`a.body`)} or ${match(sql`a.external_id`)}) order by a.occurred_at desc ${limit}`,
    ),
    run(
      "tools",
      sql`select t.id, t.name as title, t.purpose as body, p.id as project_id, p.name as project_name, t.category::text as kind, t.created_at::text as at, ${total}
          from project_tools t join projects p on p.id = t.project_id
          where ${owned} and (${match(sql`t.name`)} or ${match(sql`t.purpose`)} or ${match(sql`t.notes`)}) order by t.created_at desc ${limit}`,
    ),
  ]);

  const href = (group: SearchGroup, r: Row) => {
    const base = `/projects/${r.project_id}`;
    switch (group) {
      case "projects": return base;
      case "decisions":
      case "notes": return `${base}/rubrica#note-${r.id}`;
      case "features": return `${base}/escopo`;
      case "milestones": return `${base}/roadmap#milestone-${r.id}`;
      case "timeline": return `${base}/timeline`;
      case "activity": return `${base}/github`;
      case "tools": return `${base}/ferramentas`;
    }
  };

  const result = groups
    .filter((g) => g.rows.length > 0)
    .map((g) => ({
      group: g.group,
      count: g.total,
      hits: g.rows.map<SearchHit>((r) => ({
        id: r.id,
        group: g.group,
        title: r.title,
        snippet: snippetAround(r.body, query),
        projectId: r.project_id,
        projectName: r.project_name,
        href: href(g.group, r),
        kind: r.kind ?? undefined,
        at: r.at,
      })),
    }));
  return { query, total: result.reduce((s, g) => s + g.count, 0), groups: result };
}
