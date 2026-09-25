import type { NoteType } from "./notes";

export type JournalEntry = { id: string; title: string; content: string; type: NoteType; tags: string[]; createdAt: string };
export type JournalFilter = { query: string; type: NoteType | "all"; tag: string | null; order: "newest" | "oldest" };

const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Client-side Rubrica filtering: accent-insensitive, every word must match. */
export function filterJournal<T extends JournalEntry>(entries: T[], filter: JournalFilter): T[] {
  const words = fold(filter.query.trim()).split(/\s+/).filter(Boolean);
  const result = entries.filter((e) => {
    if (filter.type !== "all" && e.type !== filter.type) return false;
    if (filter.tag && !e.tags.includes(filter.tag)) return false;
    if (words.length === 0) return true;
    const haystack = fold(`${e.title} ${e.content} ${e.tags.map((t) => `#${t}`).join(" ")}`);
    return words.every((w) => haystack.includes(w.replace(/^#/, "")));
  });
  return result.sort((a, b) => (filter.order === "newest" ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt)));
}

export function tagCounts(entries: JournalEntry[]) {
  const map = new Map<string, number>();
  for (const e of entries) for (const t of e.tags) map.set(t, (map.get(t) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
