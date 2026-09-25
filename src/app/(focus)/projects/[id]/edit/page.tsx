import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectWizard } from "@/components/project-form/project-wizard";
import { FORM_STEPS } from "@/domain/project-form";
import { requireUser } from "@/server/auth/session";
import { projectToFormValues } from "@/server/projects/mappers";
import { getFeatures, getProject, getReferences } from "@/server/projects/queries";

export const metadata: Metadata = { title: "Editar projeto" };

export default async function EditProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ step?: string }> }) {
  const user = await requireUser();
  const [{ id }, { step }] = await Promise.all([params, searchParams]);
  const project = await getProject(user.id, id);
  if (!project) notFound();
  const [features, references] = await Promise.all([getFeatures(project.id), getReferences(project.id)]);
  const initialStep = Math.max(0, FORM_STEPS.findIndex((s) => s.key === step));

  return <ProjectWizard mode="edit" projectId={project.id} initialValues={projectToFormValues(project, features, references)} initialStep={initialStep} />;
}
