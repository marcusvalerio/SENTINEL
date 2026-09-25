import { describe, expect, it } from "vitest";
import { filterJournal, tagCounts } from "./journal";
import { parseInline, parseMarkdown, safeHref } from "./markdown";
import { extractHashtags, mergeTags, normalizeTag } from "./tags";

describe("tags", () => {
  it("normalizes tags", () => {
    expect(normalizeTag("#UX")).toBe("ux");
    expect(normalizeTag("  Back End ")).toBe("back-end");
    expect(normalizeTag("#decisão")).toBe("decisão");
  });

  it("extracts hashtags from text but not headings or numbers", () => {
    expect(extractHashtags("Falar com #produto sobre #UX.\n# Título\nIssue #12")).toEqual(["produto", "ux"]);
  });

  it("merges without duplicates", () => {
    expect(mergeTags(["ux", "#UX"], ["bug"])).toEqual(["ux", "bug"]);
  });
});

describe("markdown", () => {
  it("parses blocks", () => {
    const blocks = parseMarkdown("# Título\n\nTexto **forte**\n\n- um\n- dois\n\n> citação\n\n```\ncode\n```");
    expect(blocks.map((b) => b.t)).toEqual(["h", "p", "ul", "quote", "pre"]);
  });

  it("parses inline marks, links and tags", () => {
    const inline = parseInline("veja [docs](https://x.dev) e `code` #ux *ok*");
    expect(inline.map((n) => n.t)).toEqual(["text", "link", "text", "code", "text", "tag", "text", "em"]);
  });

  it("refuses unsafe link protocols", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,x")).toBeNull();
    expect(safeHref("figma.com/file/1")).toBe("https://figma.com/file/1");
    const inline = parseInline("[x](javascript:alert(1))");
    expect(inline.every((n) => n.t === "text")).toBe(true);
  });
});

describe("journal filter", () => {
  const entries = [
    { id: "1", title: "Leitor de QR Code", content: "Decidimos usar câmera", type: "decision" as const, tags: ["produto"], createdAt: "2026-09-01T00:00:00Z" },
    { id: "2", title: "Bug no login", content: "Sessão expirando", type: "problem" as const, tags: ["bug", "backend"], createdAt: "2026-09-03T00:00:00Z" },
    { id: "3", title: "Ideia", content: "qr code no rótulo", type: "idea" as const, tags: [], createdAt: "2026-09-02T00:00:00Z" },
  ];
  const base = { query: "", type: "all" as const, tag: null, order: "newest" as const };

  it("searches accent-insensitively across title, content and tags", () => {
    expect(filterJournal(entries, { ...base, query: "QR code" }).map((e) => e.id)).toEqual(["3", "1"]);
    expect(filterJournal(entries, { ...base, query: "camera" }).map((e) => e.id)).toEqual(["1"]);
    expect(filterJournal(entries, { ...base, query: "#backend" }).map((e) => e.id)).toEqual(["2"]);
  });

  it("filters by type and tag and sorts", () => {
    expect(filterJournal(entries, { ...base, type: "problem" }).map((e) => e.id)).toEqual(["2"]);
    expect(filterJournal(entries, { ...base, tag: "produto" }).map((e) => e.id)).toEqual(["1"]);
    expect(filterJournal(entries, { ...base, order: "oldest" }).map((e) => e.id)).toEqual(["1", "3", "2"]);
  });

  it("counts tags", () => {
    expect(tagCounts(entries)[0]).toEqual(["backend", 1]);
  });
});
