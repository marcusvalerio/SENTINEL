import "server-only";
import { draftTitle, type ProjectFormValues } from "@/domain/project-form";
import { db } from "@/server/db/client";
import { projectDrafts } from "@/server/db/schema";
import type { ProjectOrigin } from "./actions";

/**
 * Creates a registration draft carrying its origin (import / pre-project).
 * Server-only on purpose: it trusts `ownerId`, so it must never be exposed as
 * a server action. Callers authorize first.
 */
export async function createDraftWithOrigin(ownerId: string, values: ProjectFormValues, origin: ProjectOrigin) {
  const [draft] = await db
    .insert(projectDrafts)
    .values({ ownerId, data: { ...values, __origin: origin }, currentStep: 0, title: draftTitle(values) })
    .returning({ id: projectDrafts.id });
  return draft!.id;
}

export function readDraftOrigin(data: unknown): ProjectOrigin | null {
  const origin = (data as { __origin?: unknown } | null)?.__origin as ProjectOrigin | null | undefined;
  if (!origin || typeof origin !== "object") return null;
  if (origin.kind === "pre_project" && typeof origin.preProjectId === "string") return origin;
  if (origin.kind === "github_import" && typeof origin.repository === "string") {
    return { kind: "github_import", repository: origin.repository, stack: Array.isArray(origin.stack) ? origin.stack : [], analysis: origin.analysis && typeof origin.analysis === "object" ? origin.analysis : {} };
  }
  return null;
}
