import { emptyProjectForm, type ProjectFormValues } from "./project-form";

type Pre = {
  title: string;
  requesterName: string | null;
  requesterOrg: string | null;
  requesterContact: string | null;
  idea: string | null;
  problem: string | null;
  goal: string | null;
  audience: string | null;
  users: string | null;
  currentProcess: string | null;
  features: string | null;
  initialScope: string | null;
  futureFeatures: string | null;
  integrations: string | null;
  references: string | null;
  platform: string | null;
  deadline: string | null;
  budget: string | null;
  constraints: string | null;
  observations: string | null;
};

/**
 * Pre-project → project registration. Only answers that were actually given
 * are carried over; everything else is left for the person to fill.
 */
export function preProjectToForm(pre: Pre, leadName: string, key: () => string): ProjectFormValues {
  const s = (v: string | null) => v?.trim() ?? "";
  const features = s(pre.features)
    .split("\n")
    .map((l) => l.replace(/^\s*[-*•\d.)]+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 50)
    .map((name) => ({ key: key(), name: name.slice(0, 140), description: "", priority: "important" as const }));

  const context = [
    pre.requesterName || pre.requesterOrg ? `Solicitado por ${[pre.requesterName, pre.requesterOrg].filter(Boolean).join(" · ")}${pre.requesterContact ? ` (${pre.requesterContact})` : ""}.` : "",
    pre.currentProcess ? `Como funciona hoje:\n${pre.currentProcess}` : "",
    pre.initialScope ? `Escopo inicial:\n${pre.initialScope}` : "",
    pre.futureFeatures ? `Funcionalidades futuras:\n${pre.futureFeatures}` : "",
    pre.references ? `Referências:\n${pre.references}` : "",
    pre.platform ? `Plataforma: ${pre.platform}` : "",
    pre.budget ? `Orçamento (pré-projeto): ${pre.budget}` : "",
    pre.observations ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return emptyProjectForm({
    name: pre.title,
    summary: s(pre.idea).slice(0, 280),
    status: "planning",
    leadName,
    problem: s(pre.problem),
    primaryGoal: s(pre.goal),
    audience: s(pre.audience),
    endUsers: s(pre.users),
    features,
    technicalConstraints: s(pre.constraints),
    integrations: s(pre.integrations),
    engagement: pre.requesterOrg || pre.requesterName ? "client" : "",
    clientName: s(pre.requesterOrg) || s(pre.requesterName),
    desiredDeadline: s(pre.deadline).slice(0, 160),
    observations: context,
  });
}
