import { z } from "zod";
import { parseMoneyToCents } from "@/lib/format";
import {
  ASSET_AVAILABILITY,
  ENGAGEMENTS,
  FEATURE_PRIORITIES,
  FEATURE_STATUSES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  type AssetAvailability,
  type Engagement,
  type FeaturePriority,
  type FeatureStatus,
  type ProjectStatus,
  type ProjectType,
} from "./project";

/**
 * The discovery form ("nascimento de um projeto").
 *
 * `ProjectFormValues` is the client-side shape — plain strings, easy to bind
 * and to autosave as a draft. `projectInputSchema` turns it into clean,
 * validated data for persistence. Both client and server use the same rules.
 */

export type FeatureDraft = {
  key: string;
  id?: string;
  name: string;
  description: string;
  priority: FeaturePriority;
  status?: FeatureStatus;
};

export type ReferenceDraft = { key: string; id?: string; name: string; url: string; description: string };

export type ProjectFormValues = {
  // 01 Identity
  name: string;
  codename: string;
  summary: string;
  type: ProjectType | "";
  category: string;
  status: ProjectStatus;
  startedOn: string;
  leadName: string;
  // 02 Context
  problem: string;
  primaryGoal: string;
  secondaryGoals: string;
  audience: string;
  endUsers: string;
  expectedOutcome: string;
  successCriteria: string;
  // 03 Scope
  features: FeatureDraft[];
  mandatoryFeatures: string;
  technicalConstraints: string;
  integrations: string;
  // 04 Design
  hasVisualIdentity: AssetAvailability | "";
  hasLogo: AssetAvailability | "";
  hasBrandManual: AssetAvailability | "";
  visualReferencesNotes: string;
  desiredFeeling: string;
  stylesToAvoid: string;
  references: ReferenceDraft[];
  // 05 Business
  engagement: Engagement | "";
  clientName: string;
  hasBudget: "" | "yes" | "no";
  budget: string;
  investmentPlanned: string;
  investmentRealized: string;
  expectedRevenue: string;
  monetizationModel: string;
  desiredDeadline: string;
  launchTargetOn: string;
  // 06 Observations
  observations: string;
};

export function emptyProjectForm(overrides: Partial<ProjectFormValues> = {}): ProjectFormValues {
  return {
    name: "",
    codename: "",
    summary: "",
    type: "",
    category: "",
    status: "idea",
    startedOn: "",
    leadName: "",
    problem: "",
    primaryGoal: "",
    secondaryGoals: "",
    audience: "",
    endUsers: "",
    expectedOutcome: "",
    successCriteria: "",
    features: [],
    mandatoryFeatures: "",
    technicalConstraints: "",
    integrations: "",
    hasVisualIdentity: "",
    hasLogo: "",
    hasBrandManual: "",
    visualReferencesNotes: "",
    desiredFeeling: "",
    stylesToAvoid: "",
    references: [],
    engagement: "",
    clientName: "",
    hasBudget: "",
    budget: "",
    investmentPlanned: "",
    investmentRealized: "",
    expectedRevenue: "",
    monetizationModel: "",
    desiredDeadline: "",
    launchTargetOn: "",
    observations: "",
    ...overrides,
  };
}

/**
 * Merges an arbitrary (possibly old or partial) draft payload into a complete
 * form object. Unknown keys are dropped; wrong types fall back to defaults.
 */
export function hydrateProjectForm(data: unknown): ProjectFormValues {
  const base = emptyProjectForm();
  if (!data || typeof data !== "object") return base;
  const source = data as Record<string, unknown>;
  const result: Record<string, unknown> = { ...base };
  for (const key of Object.keys(base) as (keyof ProjectFormValues)[]) {
    const value = source[key];
    if (Array.isArray(base[key])) {
      if (Array.isArray(value)) result[key] = value.filter((item) => item && typeof item === "object");
    } else if (typeof value === "string") {
      result[key] = value;
    }
  }
  const parsed = result as ProjectFormValues;
  if (!PROJECT_STATUSES.includes(parsed.status)) parsed.status = "idea";
  if (parsed.type && !PROJECT_TYPES.includes(parsed.type)) parsed.type = "";
  parsed.features = parsed.features.map((f, i) => ({
    key: typeof f.key === "string" ? f.key : `f${i}`,
    id: typeof f.id === "string" ? f.id : undefined,
    name: typeof f.name === "string" ? f.name : "",
    description: typeof f.description === "string" ? f.description : "",
    priority: FEATURE_PRIORITIES.includes(f.priority) ? f.priority : "important",
    status: f.status && FEATURE_STATUSES.includes(f.status) ? f.status : undefined,
  }));
  parsed.references = parsed.references.map((r, i) => ({
    key: typeof r.key === "string" ? r.key : `r${i}`,
    id: typeof r.id === "string" ? r.id : undefined,
    name: typeof r.name === "string" ? r.name : "",
    url: typeof r.url === "string" ? r.url : "",
    description: typeof r.description === "string" ? r.description : "",
  }));
  return parsed;
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                   */
/* -------------------------------------------------------------------------- */

export const LIMITS = {
  name: 120,
  codename: 40,
  summary: 280,
  short: 160,
  long: 8000,
  observations: 40000,
  featureName: 140,
  url: 2048,
} as const;

const text = (max: number, message?: string) =>
  z
    .string()
    .trim()
    .max(max, message ?? `Use no máximo ${max} caracteres.`)
    .transform((v) => (v === "" ? null : v));

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.enum(values), z.literal("")])
    .transform((v) => (v === "" ? null : (v as T[number])));

const isoDate = z
  .string()
  .trim()
  .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), "Informe uma data válida.")
  .transform((v) => (v === "" ? null : v));

const money = z.string().transform((value, ctx) => {
  const cents = parseMoneyToCents(value);
  if (cents !== null && Number.isNaN(cents)) {
    ctx.addIssue({ code: "custom", message: "Informe um valor válido, por exemplo 12.500,00." });
    return z.NEVER;
  }
  if (cents !== null && cents > 1e15) {
    ctx.addIssue({ code: "custom", message: "Valor alto demais." });
    return z.NEVER;
  }
  return cents;
});

const httpUrl = z
  .string()
  .trim()
  .max(LIMITS.url, "Endereço longo demais.")
  .transform((v) => (v === "" ? null : /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`))
  .refine((v) => {
    if (v === null) return true;
    try {
      const url = new URL(v);
      return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".");
    } catch {
      return false;
    }
  }, "Informe um endereço válido, como figma.com/file/…");

export const featureInputSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Dê um nome à funcionalidade.").max(LIMITS.featureName, `Use no máximo ${LIMITS.featureName} caracteres.`),
  description: text(LIMITS.long),
  priority: z.enum(FEATURE_PRIORITIES),
  status: z.enum(FEATURE_STATUSES).optional(),
});

export const referenceInputSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Dê um nome à referência.").max(LIMITS.short, `Use no máximo ${LIMITS.short} caracteres.`),
  url: httpUrl,
  description: text(LIMITS.long),
});

export const projectInputSchema = z.object({
  name: z.string().trim().min(1, "Todo projeto precisa de um nome.").max(LIMITS.name, `Use no máximo ${LIMITS.name} caracteres.`),
  codename: text(LIMITS.codename),
  summary: text(LIMITS.summary),
  type: z.enum(PROJECT_TYPES, { error: "Escolha o tipo de projeto." }),
  category: text(LIMITS.short),
  status: z.enum(PROJECT_STATUSES, { error: "Escolha um status." }),
  startedOn: isoDate,
  leadName: text(LIMITS.short),

  problem: text(LIMITS.long),
  primaryGoal: z
    .string()
    .trim()
    .min(1, "Descreva o objetivo principal — é ele que dá sentido ao projeto.")
    .max(LIMITS.long, `Use no máximo ${LIMITS.long} caracteres.`),
  secondaryGoals: text(LIMITS.long),
  audience: text(LIMITS.long),
  endUsers: text(LIMITS.long),
  expectedOutcome: text(LIMITS.long),
  successCriteria: text(LIMITS.long),

  features: z.array(featureInputSchema).max(200, "Limite de 200 funcionalidades por vez."),
  mandatoryFeatures: text(LIMITS.long),
  technicalConstraints: text(LIMITS.long),
  integrations: text(LIMITS.long),

  hasVisualIdentity: optionalEnum(ASSET_AVAILABILITY),
  hasLogo: optionalEnum(ASSET_AVAILABILITY),
  hasBrandManual: optionalEnum(ASSET_AVAILABILITY),
  visualReferencesNotes: text(LIMITS.long),
  desiredFeeling: text(LIMITS.long),
  stylesToAvoid: text(LIMITS.long),
  references: z.array(referenceInputSchema).max(100, "Limite de 100 referências."),

  engagement: optionalEnum(ENGAGEMENTS),
  clientName: text(LIMITS.short),
  hasBudget: z.enum(["", "yes", "no"]).transform((v) => (v === "" ? null : v === "yes")),
  budget: money,
  investmentPlanned: money,
  investmentRealized: money,
  expectedRevenue: money,
  monetizationModel: text(LIMITS.long),
  desiredDeadline: text(LIMITS.short),
  launchTargetOn: isoDate,

  observations: text(LIMITS.observations),
});

export type ProjectInput = z.output<typeof projectInputSchema>;

/* -------------------------------------------------------------------------- */
/* Steps                                                                        */
/* -------------------------------------------------------------------------- */

export const FORM_STEPS = [
  { key: "identity", label: "Identidade", description: "Nome, tipo e status" },
  { key: "context", label: "Contexto", description: "Por que existe" },
  { key: "scope", label: "Escopo", description: "O que construir" },
  { key: "design", label: "Design", description: "Como deve ser" },
  { key: "business", label: "Negócio", description: "Contexto e finanças" },
  { key: "notes", label: "Observações", description: "O que não pode se perder" },
] as const;

export const REVIEW_STEP = FORM_STEPS.length;

/** Which step owns each field — used to route validation errors to the right place. */
export const FIELD_STEP: Record<keyof ProjectFormValues, number> = {
  name: 0, codename: 0, summary: 0, type: 0, category: 0, status: 0, startedOn: 0, leadName: 0,
  problem: 1, primaryGoal: 1, secondaryGoals: 1, audience: 1, endUsers: 1, expectedOutcome: 1, successCriteria: 1,
  features: 2, mandatoryFeatures: 2, technicalConstraints: 2, integrations: 2,
  hasVisualIdentity: 3, hasLogo: 3, hasBrandManual: 3, visualReferencesNotes: 3, desiredFeeling: 3, stylesToAvoid: 3, references: 3,
  engagement: 4, clientName: 4, hasBudget: 4, budget: 4, investmentPlanned: 4, investmentRealized: 4, expectedRevenue: 4,
  monetizationModel: 4, desiredDeadline: 4, launchTargetOn: 4,
  observations: 5,
};

/** Flat error map: "name", "features.2.name", "references.0.url"… */
export type FormErrors = Record<string, string>;

export function collectErrors(values: ProjectFormValues): FormErrors {
  const result = projectInputSchema.safeParse(values);
  if (result.success) return {};
  const errors: FormErrors = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    if (!errors[path]) errors[path] = issue.message;
  }
  return errors;
}

export function stepOfError(path: string): number {
  const root = path.split(".")[0] as keyof ProjectFormValues;
  return FIELD_STEP[root] ?? 0;
}

export function errorsForStep(errors: FormErrors, step: number): FormErrors {
  return Object.fromEntries(Object.entries(errors).filter(([path]) => stepOfError(path) === step));
}

/** A short title for draft listings. */
export function draftTitle(values: Pick<ProjectFormValues, "name" | "codename">) {
  return values.name.trim() || values.codename.trim() || null;
}
