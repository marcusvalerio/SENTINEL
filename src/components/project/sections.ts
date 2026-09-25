export const PROJECT_SECTIONS = [
  { slug: "", label: "Overview" },
  { slug: "rubrica", label: "Rubrica" },
  { slug: "objetivos", label: "Objetivos" },
  { slug: "escopo", label: "Escopo" },
  { slug: "roadmap", label: "Roadmap" },
  { slug: "timeline", label: "Timeline" },
  { slug: "design", label: "Design" },
  { slug: "tecnologia", label: "Tecnologia" },
  { slug: "ferramentas", label: "Ferramentas" },
  { slug: "github", label: "GitHub" },
  { slug: "financas", label: "Finanças" },
  { slug: "documentacao", label: "Documentação" },
] as const;

export type SectionSlug = (typeof PROJECT_SECTIONS)[number]["slug"];
