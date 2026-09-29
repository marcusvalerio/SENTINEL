import { z } from "zod";

export const PRE_PROJECT_STATUSES = ["new", "discovery", "waiting_info", "estimating", "proposal_sent", "approved", "declined", "archived"] as const;
export type PreProjectStatus = (typeof PRE_PROJECT_STATUSES)[number];

export const PRE_PROJECT_STATUS_LABELS: Record<PreProjectStatus, string> = {
  new: "Novo",
  discovery: "Em descoberta",
  waiting_info: "Aguardando informações",
  estimating: "Orçamento em elaboração",
  proposal_sent: "Proposta enviada",
  approved: "Aprovado",
  declined: "Recusado",
  archived: "Arquivado",
};

/** Open pipeline stages, in order — the rest are outcomes. */
export const PRE_PROJECT_PIPELINE: PreProjectStatus[] = ["new", "discovery", "waiting_info", "estimating", "proposal_sent"];

export const PRE_PROJECT_TONE: Record<PreProjectStatus, string> = {
  new: "var(--color-status-idea)",
  discovery: "var(--color-status-planning)",
  waiting_info: "var(--color-warning)",
  estimating: "var(--color-status-development)",
  proposal_sent: "var(--color-accent)",
  approved: "var(--color-success)",
  declined: "var(--color-danger)",
  archived: "var(--color-status-archived)",
};

export const PRE_PROJECT_FIELDS = [
  "requesterName",
  "requesterOrg",
  "requesterContact",
  "idea",
  "problem",
  "goal",
  "audience",
  "users",
  "currentProcess",
  "features",
  "initialScope",
  "futureFeatures",
  "integrations",
  "references",
  "platform",
  "deadline",
  "budget",
  "constraints",
  "observations",
] as const;
export type PreProjectField = (typeof PRE_PROJECT_FIELDS)[number];

const text = (max = 8000) => z.string().trim().max(max, `Use no máximo ${max} caracteres.`).transform((v) => v || null);

export const preProjectInputSchema = z.object({
  title: z.string().trim().min(1, "Dê um nome provisório — pode mudar depois.").max(160, "Use no máximo 160 caracteres."),
  requesterName: text(160),
  requesterOrg: text(160),
  requesterContact: text(240),
  idea: text(),
  problem: text(),
  goal: text(),
  audience: text(),
  users: text(),
  currentProcess: text(),
  features: text(),
  initialScope: text(),
  futureFeatures: text(),
  integrations: text(),
  references: text(),
  platform: text(240),
  deadline: text(240),
  budget: text(240),
  constraints: text(),
  observations: text(40000),
});

export type PreProjectInput = z.input<typeof preProjectInputSchema>;

export function emptyPreProject(): Record<"title" | PreProjectField, string> {
  return Object.fromEntries(["title", ...PRE_PROJECT_FIELDS].map((k) => [k, ""])) as Record<"title" | PreProjectField, string>;
}

/** Questionnaire chapters — each one a short conversation, not a form. */
export const PRE_PROJECT_CHAPTERS: { key: string; title: string; lead: string; fields: { key: "title" | PreProjectField; label: string; placeholder?: string; long?: boolean }[] }[] = [
  {
    key: "who",
    title: "Quem está pedindo?",
    lead: "Registre de onde a demanda veio. Um nome provisório já basta para começar.",
    fields: [
      { key: "title", label: "Nome provisório", placeholder: "Ex.: Portal de pedidos da Distribuidora Norte" },
      { key: "requesterName", label: "Quem solicitou", placeholder: "Nome da pessoa" },
      { key: "requesterOrg", label: "Empresa ou pessoa", placeholder: "Organização, se houver" },
      { key: "requesterContact", label: "Contato", placeholder: "E-mail, telefone ou onde a conversa acontece" },
    ],
  },
  {
    key: "why",
    title: "Qual é a ideia?",
    lead: "Nas palavras de quem pediu. Não precisa estar organizado ainda.",
    fields: [
      { key: "idea", label: "A ideia", long: true },
      { key: "problem", label: "Qual problema resolve?", long: true },
      { key: "goal", label: "Qual é o objetivo?", long: true },
      { key: "currentProcess", label: "Como funciona hoje?", placeholder: "Planilha, papel, outro sistema, ninguém faz…", long: true },
    ],
  },
  {
    key: "people",
    title: "Para quem?",
    lead: "Quem se beneficia e quem vai usar no dia a dia.",
    fields: [
      { key: "audience", label: "Público", long: true },
      { key: "users", label: "Usuários", long: true },
    ],
  },
  {
    key: "what",
    title: "O que precisa existir?",
    lead: "Separe o que é essencial agora do que pode vir depois.",
    fields: [
      { key: "features", label: "Funcionalidades mencionadas", placeholder: "Uma por linha", long: true },
      { key: "initialScope", label: "Escopo inicial", long: true },
      { key: "futureFeatures", label: "Funcionalidades futuras", long: true },
      { key: "integrations", label: "Integrações", long: true },
      { key: "references", label: "Referências", placeholder: "Sistemas, sites ou exemplos citados", long: true },
      { key: "platform", label: "Plataforma", placeholder: "Web, mobile, desktop…" },
    ],
  },
  {
    key: "terms",
    title: "Condições",
    lead: "O que se sabe sobre prazo, orçamento e limites. Tudo opcional.",
    fields: [
      { key: "deadline", label: "Prazo", placeholder: "Ex.: até março, sem pressa…" },
      { key: "budget", label: "Orçamento", placeholder: "Faixa, valor ou “a definir”" },
      { key: "constraints", label: "Restrições", long: true },
      { key: "observations", label: "Observações", long: true },
    ],
  },
];
