import "server-only";
import { emptyProjectForm, type ProjectFormValues } from "@/domain/project-form";
import { centsToInput } from "@/lib/format";
import type { ProjectFeature, ProjectReference } from "@/server/db/schema";
import type { ProjectDetail } from "./queries";

/** Turns a persisted project back into editable form values. */
export function projectToFormValues(project: ProjectDetail, features: ProjectFeature[], references: ProjectReference[]): ProjectFormValues {
  const s = (value: string | null | undefined) => value ?? "";
  const f = project.finance;
  return emptyProjectForm({
    name: project.name,
    codename: s(project.codename),
    summary: s(project.summary),
    type: project.type,
    category: s(project.category),
    status: project.status,
    startedOn: s(project.startedOn),
    leadName: s(project.leadName),
    problem: s(project.problem),
    primaryGoal: project.primaryGoal,
    secondaryGoals: s(project.secondaryGoals),
    audience: s(project.audience),
    endUsers: s(project.endUsers),
    expectedOutcome: s(project.expectedOutcome),
    successCriteria: s(project.successCriteria),
    features: features.map((feature) => ({
      key: feature.id,
      id: feature.id,
      name: feature.name,
      description: s(feature.description),
      priority: feature.priority,
      status: feature.status,
    })),
    mandatoryFeatures: s(project.mandatoryFeatures),
    technicalConstraints: s(project.technicalConstraints),
    integrations: s(project.integrations),
    hasVisualIdentity: project.hasVisualIdentity ?? "",
    hasLogo: project.hasLogo ?? "",
    hasBrandManual: project.hasBrandManual ?? "",
    visualReferencesNotes: s(project.visualReferencesNotes),
    desiredFeeling: s(project.desiredFeeling),
    stylesToAvoid: s(project.stylesToAvoid),
    references: references.map((r) => ({ key: r.id, id: r.id, name: r.name, url: s(r.url), description: s(r.description) })),
    engagement: project.engagement ?? "",
    clientName: s(project.clientName),
    hasBudget: f?.hasBudget === true ? "yes" : f?.hasBudget === false ? "no" : "",
    budget: centsToInput(f?.budgetCents),
    investmentPlanned: centsToInput(f?.investmentPlannedCents),
    investmentRealized: centsToInput(f?.investmentRealizedCents),
    expectedRevenue: centsToInput(f?.expectedRevenueCents),
    monetizationModel: s(f?.monetizationModel),
    desiredDeadline: s(project.desiredDeadline),
    launchTargetOn: s(project.launchTargetOn),
    observations: s(project.observations),
  });
}
