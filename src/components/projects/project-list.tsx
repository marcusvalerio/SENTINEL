"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ChevronRight, GitBranch } from "lucide-react";
import { GithubMark } from "@/components/brand/github-mark";
import { Code } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatusDot } from "@/components/ui/status";
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS, type ProjectStatus, type ProjectType } from "@/domain/project";
import { formatDate, formatRelative } from "@/lib/format";

export type ProjectRow = {
  id: string;
  name: string;
  codename: string | null;
  summary: string | null;
  type: ProjectType;
  category: string | null;
  status: ProjectStatus;
  progress: number;
  lastActivityAt: string;
  createdAt: string;
  github: { owner: string; name: string } | null;
  featureCount: number;
  noteCount: number;
};

const GRID = "lg:grid-cols-[minmax(0,1fr)_180px_150px_120px_170px]";

export function ProjectList({ projects }: { projects: ProjectRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg bg-surface/60 shadow-[inset_0_0_0_1px_var(--color-line)]">
      <div className={`hidden border-b border-line px-5 py-2.5 lg:grid ${GRID} lg:gap-6`} aria-hidden>
        {["Projeto", "Estado", "Progresso", "Atividade", "Repositório"].map((label) => (
          <span key={label} className="eyebrow">
            {label}
          </span>
        ))}
      </div>
      <motion.ul initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.03 } } }} className="divide-y divide-line">
        {projects.map((project) => (
          <motion.li
            key={project.id}
            variants={{ hidden: { opacity: 0, y: 4 }, visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.25, 1, 0.5, 1] } } }}
          >
            <ProjectRowLink project={project} />
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

function ProjectRowLink({ project }: { project: ProjectRow }) {
  const meta = [PROJECT_TYPE_LABELS[project.type], project.category].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/projects/${project.id}`}
      className={`group relative grid grid-cols-1 gap-3 px-4 py-4 transition-colors duration-150 hover:bg-surface-2/70 focus-visible:bg-surface-2/70 focus-visible:shadow-none sm:px-5 lg:items-center lg:gap-6 ${GRID}`}
    >
      <span className="absolute inset-y-3 left-0 w-[2px] origin-center scale-y-0 rounded-full bg-accent transition-transform duration-200 group-hover:scale-y-100 group-focus-visible:scale-y-100" aria-hidden />

      {/* Identity */}
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <StatusDot status={project.status} />
          <span className="truncate font-display text-h4 font-medium text-fg-strong">{project.name}</span>
          {project.codename && <Code className="hidden shrink-0 sm:inline-flex">{project.codename}</Code>}
        </div>
        <p className="line-clamp-1 pl-[18px] text-body-sm text-fg-muted">{project.summary || <span className="text-fg-subtle italic">Sem descrição curta</span>}</p>
      </div>

      {/* State */}
      <div className="flex flex-wrap items-center gap-x-2 pl-[18px] text-body-sm lg:flex-col lg:items-start lg:gap-0 lg:pl-0">
        <span className="text-fg">{PROJECT_STATUS_LABELS[project.status]}</span>
        <span className="text-fg-subtle lg:hidden" aria-hidden>
          ·
        </span>
        <span className="truncate text-caption tracking-normal text-fg-subtle">{meta}</span>
      </div>

      {/* Progress */}
      <div className="pl-[18px] lg:pl-0">
        <Progress value={project.progress} showValue size="xs" label={`Progresso de ${project.name}`} />
      </div>

      {/* Activity */}
      <div className="flex items-center gap-2 pl-[18px] text-body-sm lg:flex-col lg:items-start lg:gap-0 lg:pl-0">
        <span className="text-fg" suppressHydrationWarning>
          {formatRelative(project.lastActivityAt)}
        </span>
        <span className="text-caption tracking-normal text-fg-subtle">desde {formatDate(project.createdAt, "numeric")}</span>
      </div>

      {/* Repository */}
      <div className="flex min-w-0 items-center gap-2 pl-[18px] text-body-sm lg:pr-6 lg:pl-0">
        {project.github ? (
          <>
            <GithubMark className="size-3.5 shrink-0 text-fg-muted" />
            <span className="truncate font-mono text-[0.75rem] text-fg-muted">
              {project.github.owner}/<span className="text-fg">{project.github.name}</span>
            </span>
          </>
        ) : (
          <span className="flex items-center gap-2 text-caption tracking-normal text-fg-subtle">
            <GitBranch className="size-3.5" aria-hidden />
            Sem repositório
          </span>
        )}
      </div>

      <ChevronRight
        className="absolute top-1/2 right-4 hidden size-4 -translate-x-1 -translate-y-1/2 text-fg-subtle opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 lg:block"
        aria-hidden
      />
    </Link>
  );
}
