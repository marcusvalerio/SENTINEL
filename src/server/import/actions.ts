"use server";

import { randomUUID } from "node:crypto";
import { parseRepositoryRef } from "@/domain/github";
import { emptyProjectForm } from "@/domain/project-form";
import { analyzeRepository, type RepoAnalysis } from "@/domain/repo-analysis";
import { requireUser } from "@/server/auth/session";
import { GithubError, createGithubClient } from "@/server/github/client";
import { createDraftWithOrigin } from "@/server/projects/drafts";
import type { ActionResult } from "@/server/projects/internal";

async function analyze(reference: string): Promise<ActionResult<{ analysis: RepoAnalysis }>> {
  const ref = parseRepositoryRef(reference);
  if (!ref) return { ok: false, error: "Use o formato dono/repositório ou cole a URL do GitHub." };
  try {
    const snap = await createGithubClient().fetchSnapshot(ref);
    const analysis = analyzeRepository({
      repository: {
        owner: snap.meta.owner,
        name: snap.meta.name,
        description: snap.meta.description,
        defaultBranch: snap.meta.defaultBranch,
        createdAt: snap.meta.createdAt,
        pushedAt: snap.meta.pushedAt,
        topics: snap.meta.topics,
        homepage: snap.meta.homepage,
        isPrivate: snap.meta.isPrivate,
      },
      readme: snap.readme,
      packageJson: snap.packageJson,
      paths: snap.paths,
      languages: snap.languages,
      commits: snap.commits,
      branches: snap.branches,
    });
    if (snap.truncated) analysis.notes.push("O repositório é grande: a estrutura de arquivos foi lida parcialmente.");
    return { ok: true, analysis };
  } catch (error) {
    return { ok: false, error: error instanceof GithubError ? error.message : "Não foi possível analisar o repositório agora." };
  }
}

/** Reads the repository and returns the analysis for the preview. Nothing is stored. */
export async function analyzeRepositoryForImport(reference: string): Promise<ActionResult<{ analysis: RepoAnalysis }>> {
  await requireUser();
  return analyze(reference);
}

/**
 * Creates the registration draft from a (re-run, server-side) analysis. The
 * person then reviews every field in the wizard before the project exists.
 */
export async function createImportDraft(reference: string, options: { includeFeatures: boolean }): Promise<ActionResult<{ href: string }>> {
  const user = await requireUser();
  const result = await analyze(reference);
  if (!result.ok) return result;
  const a = result.analysis;
  const s = a.suggestion;
  const inferredNote = [
    "Importado do GitHub. Campos marcados como inferidos foram sugeridos pelo SENTINEL a partir do repositório e devem ser revisados.",
    a.stack.length ? `Stack: ${a.stack.map((i) => `${i.name} (${i.provenance === "detected" ? "detectado" : "inferido"})`).join(", ")}.` : "",
    a.modules.length ? `Módulos inferidos pelas rotas: ${a.modules.map((m) => m.label).join(", ")}.` : "",
    a.migrations ? `Migrations: ${a.migrations.count} (${a.migrations.tool}).` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const values = emptyProjectForm({
    name: s.name?.value ?? a.repository.name,
    summary: s.summary?.value ?? "",
    type: s.type?.value ?? "",
    status: s.status?.value ?? "in_development",
    startedOn: s.startedOn?.value ?? "",
    leadName: user.name,
    primaryGoal: s.primaryGoal?.value ?? "",
    features: options.includeFeatures ? a.features.slice(0, 30).map((f) => ({ key: randomUUID(), name: f.label.slice(0, 140), description: "", priority: "important" as const })) : [],
    integrations: a.integrations.map((i) => `${i.label} — ${i.provenance === "detected" ? "detectado" : "inferido"} (${i.evidence})`).join("\n"),
    observations: inferredNote,
  });

  const draftId = await createDraftWithOrigin(user.id, values, {
    kind: "github_import",
    repository: `${a.repository.owner}/${a.repository.name}`,
    stack: a.stack,
    analysis: { modules: a.modules, features: a.features, documentation: a.documentation, migrations: a.migrations, tools: a.tools, analyzedAt: new Date().toISOString() },
  });
  return { ok: true, href: `/projects/new?draft=${draftId}` };
}
