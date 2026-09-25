/**
 * A deliberately small Markdown dialect for the Rubrica. Parsed into a tree
 * that is rendered as React elements — no HTML string is ever injected, so
 * user text can never become markup.
 *
 * Blocks: paragraphs, # / ## / ### headings, - and 1. lists, > quotes, ``` code.
 * Inline: **bold**, *italic* / _italic_, `code`, [label](https://…), bare URLs, #tags.
 */

export type Inline =
  | { t: "text"; v: string }
  | { t: "strong"; c: Inline[] }
  | { t: "em"; c: Inline[] }
  | { t: "code"; v: string }
  | { t: "link"; href: string; c: Inline[] }
  | { t: "tag"; v: string };

export type Block =
  | { t: "p"; c: Inline[] }
  | { t: "h"; level: 1 | 2 | 3; c: Inline[] }
  | { t: "ul"; items: Inline[][] }
  | { t: "ol"; items: Inline[][] }
  | { t: "quote"; c: Inline[] }
  | { t: "pre"; v: string };

export function safeHref(href: string): string | null {
  const trimmed = href.trim();
  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) return trimmed;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(trimmed)) return `https://${trimmed}`;
  return null;
}

const INLINE = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)\s]+)\))|(\*([^*\s][^*]*)\*|_([^_\s][^_]*)_)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])|((?:^|(?<=[\s(]))#([\p{L}\p{N}_-]{2,32}))/gu;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    const index = m.index ?? 0;
    if (index > last) out.push({ t: "text", v: text.slice(last, index) });
    if (m[1]) out.push({ t: "strong", c: parseInline(m[2]!) });
    else if (m[3]) out.push({ t: "code", v: m[4]! });
    else if (m[5]) {
      const href = safeHref(m[7]!);
      out.push(href ? { t: "link", href, c: parseInline(m[6]!) } : { t: "text", v: m[0] });
    } else if (m[8]) out.push({ t: "em", c: parseInline((m[9] ?? m[10])!) });
    else if (m[11]) out.push({ t: "link", href: m[11], c: [{ t: "text", v: m[11].replace(/^https?:\/\//, "") }] });
    else if (m[12]) out.push({ t: "tag", v: m[13]!.toLowerCase() });
    last = index + m[0].length;
  }
  if (last < text.length) out.push({ t: "text", v: text.slice(last) });
  return out;
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ t: "p", c: parseInline(para.join("\n")) });
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^```/.test(line)) {
      flush();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i]!)) code.push(lines[i++]!);
      blocks.push({ t: "pre", v: code.join("\n") });
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ t: "h", level: heading[1]!.length as 1 | 2 | 3, c: parseInline(heading[2]!) });
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      flush();
      const items: Inline[][] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i]!)) items.push(parseInline(lines[i++]!.replace(/^\s*[-*]\s+/, "")));
      i--;
      blocks.push({ t: "ul", items });
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      flush();
      const items: Inline[][] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i]!)) items.push(parseInline(lines[i++]!.replace(/^\s*\d+[.)]\s+/, "")));
      i--;
      blocks.push({ t: "ol", items });
      continue;
    }
    if (/^>\s?/.test(line)) {
      flush();
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i]!)) quote.push(lines[i++]!.replace(/^>\s?/, ""));
      i--;
      blocks.push({ t: "quote", c: parseInline(quote.join("\n")) });
      continue;
    }
    if (line.trim() === "") flush();
    else para.push(line);
  }
  flush();
  return blocks;
}

/** Plain text for previews and search snippets. */
export function stripMarkdown(source: string) {
  return source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`>#]+/g, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
