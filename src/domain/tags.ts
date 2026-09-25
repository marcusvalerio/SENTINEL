/** Rubrica tags: lowercase, accent-preserving, no spaces. `#UX` and `ux` are the same tag. */
export function normalizeTag(raw: string) {
  return raw
    .trim()
    .replace(/^#+/, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

/** Hashtags written inline in the text (#produto, #decisão). Ignores headings and URLs fragments. */
export function extractHashtags(text: string) {
  const found = new Set<string>();
  for (const match of text.matchAll(/(?:^|[\s(])#([\p{L}\p{N}_-]{2,32})/gu)) {
    const tag = normalizeTag(match[1]!);
    if (tag && !/^\d+$/.test(tag)) found.add(tag);
  }
  return [...found];
}

export function mergeTags(...lists: string[][]) {
  const set = new Set<string>();
  for (const list of lists) for (const t of list) {
    const tag = normalizeTag(t);
    if (tag) set.add(tag);
  }
  return [...set].slice(0, 20);
}

export const SUGGESTED_TAGS = ["produto", "ux", "backend", "frontend", "ideia", "decisão", "bug", "infra", "negócio"];
