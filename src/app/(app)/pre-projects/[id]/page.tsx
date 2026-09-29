import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { ConvertButton } from "@/components/pre-projects/convert-button";
import { PreProjectView } from "@/components/pre-projects/pre-project-view";
import { StatusTrack } from "@/components/pre-projects/status-track";
import { PRE_PROJECT_FIELDS } from "@/domain/pre-projects";
import { formatDate, formatRelative } from "@/lib/format";
import { requireUser } from "@/server/auth/session";
import { getPreProject } from "@/server/pre-projects/queries";

export const metadata: Metadata = { title: "Pré-projeto" };

export default async function PreProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const pre = await getPreProject(user.id, id);
  if (!pre) notFound();
  const values = Object.fromEntries(["title", ...PRE_PROJECT_FIELDS].map((k) => [k, (pre as Record<string, unknown>)[k] ?? ""])) as Record<string, string>;

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-12 px-4 pt-10 pb-28 sm:px-6 sm:pt-14 lg:px-8">
      <Reveal className="flex flex-col gap-6">
        <nav aria-label="Trilha" className="flex items-center gap-1.5 text-body-sm text-fg-subtle">
          <Link href="/pre-projects" className="hover:text-fg">
            Pré-projetos
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <span className="truncate text-fg-muted">{pre.title}</span>
        </nav>
        <div className="flex flex-col gap-3">
          <h1 className="text-h1 break-words sm:text-display">{pre.title}</h1>
          <p className="text-body-sm text-fg-subtle" suppressHydrationWarning>
            {[pre.requesterName, pre.requesterOrg].filter(Boolean).join(" · ") || "Solicitante não informado"} · registrado em {formatDate(pre.createdAt)} · atualizado {formatRelative(pre.updatedAt)}
          </p>
        </div>
        <StatusTrack id={pre.id} status={pre.status} />
        {pre.status === "approved" &&
          (pre.convertedProjectId ? (
            <Link href={`/projects/${pre.convertedProjectId}`} className="group flex w-fit items-center gap-2 text-body text-success">
              Virou o projeto <span className="text-fg-strong">{pre.convertedProjectName}</span>
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </Link>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <ConvertButton id={pre.id} />
              <span className="text-body-sm text-fg-muted">As respostas viram um rascunho de projeto para você revisar.</span>
            </div>
          ))}
      </Reveal>
      <PreProjectView id={pre.id} values={values as never} />
    </div>
  );
}
