/**
 * Project domain vocabulary.
 *
 * Shared by the database schema, server validation and the UI so every layer
 * speaks the same language. Values are stable identifiers (persisted); labels
 * are presentation and may change freely.
 */

export const PROJECT_TYPES = [
  "saas",
  "system",
  "web_app",
  "mobile_app",
  "website",
  "branding",
  "study",
  "academic",
  "professional",
  "experiment",
  "idea",
  "other",
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  saas: "SaaS",
  system: "Sistema",
  web_app: "Aplicação Web",
  mobile_app: "Aplicativo",
  website: "Website",
  branding: "Branding",
  study: "Estudo",
  academic: "Projeto acadêmico",
  professional: "Projeto profissional",
  experiment: "Experimento",
  idea: "Ideia",
  other: "Outro",
};

export const PROJECT_STATUSES = [
  "idea",
  "planning",
  "in_development",
  "validation",
  "production",
  "paused",
  "completed",
  "archived",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  idea: "Ideia",
  planning: "Planejamento",
  in_development: "Em desenvolvimento",
  validation: "Em validação",
  production: "Em produção",
  paused: "Em pausa",
  completed: "Concluído",
  archived: "Arquivado",
};

/** Dashboard groupings. A status belongs to exactly one collection. */
export const PROJECT_COLLECTIONS = ["all", "active", "paused", "completed", "archived"] as const;
export type ProjectCollection = (typeof PROJECT_COLLECTIONS)[number];

export const PROJECT_COLLECTION_LABELS: Record<ProjectCollection, string> = {
  all: "Todos",
  active: "Ativos",
  paused: "Em pausa",
  completed: "Concluídos",
  archived: "Arquivados",
};

export const COLLECTION_STATUSES: Record<Exclude<ProjectCollection, "all">, ProjectStatus[]> = {
  active: ["idea", "planning", "in_development", "validation", "production"],
  paused: ["paused"],
  completed: ["completed"],
  archived: ["archived"],
};

export function collectionOf(status: ProjectStatus): Exclude<ProjectCollection, "all"> {
  if (status === "paused") return "paused";
  if (status === "completed") return "completed";
  if (status === "archived") return "archived";
  return "active";
}

export const FEATURE_PRIORITIES = ["essential", "important", "desirable"] as const;
export type FeaturePriority = (typeof FEATURE_PRIORITIES)[number];

export const FEATURE_PRIORITY_LABELS: Record<FeaturePriority, string> = {
  essential: "Essencial",
  important: "Importante",
  desirable: "Desejável",
};

export const FEATURE_STATUSES = ["planned", "in_progress", "done"] as const;
export type FeatureStatus = (typeof FEATURE_STATUSES)[number];

export const FEATURE_STATUS_LABELS: Record<FeatureStatus, string> = {
  planned: "Planejada",
  in_progress: "Em andamento",
  done: "Concluída",
};

/** Tri-state answers for design assets: "not informed" is represented by null. */
export const ASSET_AVAILABILITY = ["yes", "in_progress", "no"] as const;
export type AssetAvailability = (typeof ASSET_AVAILABILITY)[number];

export const ASSET_AVAILABILITY_LABELS: Record<AssetAvailability, string> = {
  yes: "Sim",
  in_progress: "Em construção",
  no: "Não",
};

export const ENGAGEMENTS = ["personal", "client", "employer", "partnership"] as const;
export type Engagement = (typeof ENGAGEMENTS)[number];

export const ENGAGEMENT_LABELS: Record<Engagement, string> = {
  personal: "Projeto pessoal",
  client: "Para cliente",
  employer: "Empresa / empregador",
  partnership: "Parceria",
};

/**
 * Where the project progress number comes from. GitHub activity is
 * intentionally NOT a progress source: activity is not completion.
 */
export const PROGRESS_SOURCES = ["manual", "features", "milestones"] as const;
export type ProgressSource = (typeof PROGRESS_SOURCES)[number];

export const PROGRESS_SOURCE_LABELS: Record<ProgressSource, string> = {
  manual: "Definido manualmente",
  features: "Baseado nas funcionalidades",
  milestones: "Baseado nos milestones",
};
