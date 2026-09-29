/**
 * Project sections. The primary ones are where work happens day to day and
 * sit in the tab bar; the rest describe the project (its "document") and live
 * under "Projeto" so the bar stays short.
 */
export const PROJECT_SECTIONS = [
  { slug: "", label: "Overview", group: "primary" },
  { slug: "rubrica", label: "Rubrica", group: "primary" },
  { slug: "roadmap", label: "Roadmap", group: "primary" },
  { slug: "decisoes", label: "Decisões", group: "primary" },
  { slug: "timeline", label: "Timeline", group: "primary" },
  { slug: "github", label: "GitHub", group: "primary" },
  { slug: "financas", label: "Finanças", group: "primary" },
  { slug: "objetivos", label: "Objetivos", group: "document" },
  { slug: "escopo", label: "Escopo", group: "document" },
  { slug: "design", label: "Design", group: "document" },
  { slug: "tecnologia", label: "Tecnologia", group: "document" },
  { slug: "ferramentas", label: "Ferramentas", group: "document" },
  { slug: "documentacao", label: "Documentação", group: "document" },
] as const;

export type SectionSlug = (typeof PROJECT_SECTIONS)[number]["slug"];
