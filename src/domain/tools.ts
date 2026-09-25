import { z } from "zod";
import { parseMoneyToCents } from "@/lib/format";

export const TOOL_CATEGORIES = ["development", "design", "ai", "infrastructure", "analytics", "communication", "productivity", "other"] as const;
export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

export const TOOL_CATEGORY_LABELS: Record<ToolCategory, string> = {
  development: "Desenvolvimento",
  design: "Design",
  ai: "IA",
  infrastructure: "Infraestrutura",
  analytics: "Analytics",
  communication: "Comunicação",
  productivity: "Produtividade",
  other: "Outro",
};

export const TOOL_CATALOG: { name: string; category: ToolCategory; purpose: string }[] = [
  { name: "Claude", category: "ai", purpose: "Desenvolvimento, arquitetura e QA" },
  { name: "ChatGPT", category: "ai", purpose: "Pesquisa e ideação" },
  { name: "Figma", category: "design", purpose: "UI/UX e prototipação" },
  { name: "GitHub", category: "development", purpose: "Versionamento" },
  { name: "Vercel", category: "infrastructure", purpose: "Hospedagem e deploy" },
  { name: "Neon", category: "infrastructure", purpose: "Banco de dados PostgreSQL" },
  { name: "Supabase", category: "infrastructure", purpose: "Backend e banco de dados" },
  { name: "Lovable", category: "ai", purpose: "Prototipação com IA" },
  { name: "Cursor", category: "development", purpose: "Editor de código" },
  { name: "VS Code", category: "development", purpose: "Editor de código" },
];

/** Best guess for a tool typed by name, so the category is rarely asked for. */
export function suggestCategory(name: string): ToolCategory | null {
  const hit = TOOL_CATALOG.find((t) => t.name.toLowerCase() === name.trim().toLowerCase());
  return hit?.category ?? null;
}

const isoDate = z
  .string()
  .trim()
  .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), "Informe uma data válida.")
  .transform((v) => (v === "" ? null : v));

const optionalText = (max: number) => z.string().trim().max(max, `Use no máximo ${max} caracteres.`).transform((v) => v || null);

export const toolInputSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome da ferramenta.").max(80, "Use no máximo 80 caracteres."),
    category: z.union([z.enum(TOOL_CATEGORIES), z.literal("")]).transform((v) => (v === "" ? null : v)),
    purpose: optionalText(300),
    plan: optionalText(80),
    cost: z.string().transform((value, ctx) => {
      const cents = parseMoneyToCents(value);
      if (cents !== null && Number.isNaN(cents)) {
        ctx.addIssue({ code: "custom", message: "Informe um valor válido, por exemplo 99,90." });
        return z.NEVER;
      }
      return cents;
    }),
    frequency: optionalText(60),
    startedOn: isoDate,
    endedOn: isoDate,
    notes: optionalText(2000),
  })
  .refine((t) => !t.startedOn || !t.endedOn || t.endedOn >= t.startedOn, { path: ["endedOn"], message: "O fim deve ser depois do início." });

export type ToolInput = z.input<typeof toolInputSchema>;

export const EMPTY_TOOL: ToolInput = { name: "", category: "", purpose: "", plan: "", cost: "", frequency: "", startedOn: "", endedOn: "", notes: "" };
