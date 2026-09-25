import type { Metadata } from "next";
import { ProjectWizard } from "@/components/project-form/project-wizard";
import { emptyProjectForm, hydrateProjectForm } from "@/domain/project-form";
import { requireUser } from "@/server/auth/session";
import { getDraft } from "@/server/projects/queries";

export const metadata: Metadata = { title: "Novo projeto" };

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const user = await requireUser();
  const { draft: draftId } = await searchParams;
  const draft = draftId ? await getDraft(user.id, draftId) : null;

  return (
    <ProjectWizard
      key={draft?.id ?? "new"}
      mode="create"
      initialValues={draft ? hydrateProjectForm(draft.data) : emptyProjectForm({ leadName: user.name })}
      draftId={draft?.id ?? null}
      initialStep={draft?.currentStep ?? 0}
      savedAt={draft?.updatedAt.toISOString() ?? null}
    />
  );
}
