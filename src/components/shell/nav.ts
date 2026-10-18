export const PRIMARY_NAV = [
  { href: "/", label: "Command Center", match: (p: string) => p === "/" },
  { href: "/projects", label: "Projetos", match: (p: string) => p === "/projects" || (p.startsWith("/projects/") && !p.startsWith("/projects/import") && !p.startsWith("/projects/start")) },
  { href: "/pre-projects", label: "Pré-projetos", match: (p: string) => p.startsWith("/pre-projects") },
  { href: "/inbox", label: "Inbox", match: (p: string) => p.startsWith("/inbox") },
  { href: "/subscriptions", label: "Assinaturas", match: (p: string) => p.startsWith("/subscriptions") },
  { href: "/calendar", label: "Calendário", match: (p: string) => p.startsWith("/calendar") },
  { href: "/memory", label: "Memória", match: (p: string) => p.startsWith("/memory") },
  { href: "/history", label: "Histórico", match: (p: string) => p.startsWith("/history") },
] as const;
