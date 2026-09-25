"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, CircleCheck, CircleDot, GitCommitHorizontal, GitMerge, GitPullRequestArrow, GitPullRequestClosed, GitPullRequestDraft, Inbox, Tag } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { GITHUB_ACTIVITY_KINDS, GITHUB_ACTIVITY_LABELS, type GithubActivityKind } from "@/domain/github-activity";
import { cn } from "@/lib/cn";
import { formatDateTime, formatRelative } from "@/lib/format";

export type ActivityItem = {
  id: string;
  kind: GithubActivityKind;
  number: number | null;
  title: string;
  body: string | null;
  state: string | null;
  authorLogin: string | null;
  authorAvatarUrl: string | null;
  url: string;
  occurredAt: string;
  closedAt: string | null;
  metadata: Record<string, unknown>;
};

const STATE: Record<string, { label: string; icon: ReactNode; tone: string }> = {
  open: { label: "Aberto", icon: <GitPullRequestArrow />, tone: "text-success" },
  draft: { label: "Rascunho", icon: <GitPullRequestDraft />, tone: "text-fg-muted" },
  merged: { label: "Integrado", icon: <GitMerge />, tone: "text-[#b9a6e8]" },
  closed: { label: "Fechado", icon: <GitPullRequestClosed />, tone: "text-danger" },
  published: { label: "Publicada", icon: <Tag />, tone: "text-accent" },
  prerelease: { label: "Pré-release", icon: <Tag />, tone: "text-warning" },
};

function itemIcon(item: ActivityItem) {
  if (item.kind === "commit") return { icon: <GitCommitHorizontal />, tone: "text-fg-muted" };
  if (item.kind === "issue") return item.state === "closed" ? { icon: <CircleCheck />, tone: "text-[#b9a6e8]" } : { icon: <CircleDot />, tone: "text-success" };
  const s = STATE[item.state ?? "open"] ?? STATE.open!;
  return { icon: s.icon, tone: s.tone };
}

function stateLabel(item: ActivityItem) {
  if (item.kind === "commit") return null;
  if (item.kind === "issue") return item.state === "closed" ? "Fechada" : "Aberta";
  return STATE[item.state ?? ""]?.label ?? null;
}

function Avatar({ src, login }: { src: string | null; login: string | null }) {
  if (!login) return null;
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`${src}${src.includes("?") ? "&" : "?"}s=40`} alt="" width={16} height={16} className="size-4 rounded-full bg-surface-3" loading="lazy" />
  ) : (
    <span className="size-4 rounded-full bg-surface-3" aria-hidden />
  );
}

export function ActivityFeed({ items, counts }: { items: ActivityItem[]; counts: Record<GithubActivityKind, number> }) {
  const [kind, setKind] = useState<GithubActivityKind>("commit");
  const [detail, setDetail] = useState<ActivityItem | null>(null);
  const visible = items.filter((i) => i.kind === kind);

  return (
    <section className="flex flex-col gap-4" aria-labelledby="dev-activity">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="dev-activity" className="font-display text-h4 font-medium text-fg-strong">
            Atividade de desenvolvimento
          </h2>
          <p className="text-body-sm text-fg-muted">O que acontece no código. Atividade não é progresso.</p>
        </div>
      </div>

      <div role="tablist" aria-label="Tipo de atividade" className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {GITHUB_ACTIVITY_KINDS.map((k) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={k === kind}
            onClick={() => setKind(k)}
            className={cn("relative flex h-10 shrink-0 items-center gap-2 px-2.5 text-body-sm transition-colors", k === kind ? "text-fg-strong" : "text-fg-muted hover:text-fg-strong")}
          >
            {GITHUB_ACTIVITY_LABELS[k].many}
            <span className="font-numeric text-caption text-fg-subtle">{counts[k]}</span>
            {k === kind && <motion.span layoutId="activity-tab" className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-accent" transition={{ type: "spring", stiffness: 520, damping: 42 }} />}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState compact icon={<Inbox />} title={`Nenhum registro de ${GITHUB_ACTIVITY_LABELS[kind].many.toLowerCase()}.`} description="Nada foi encontrado no repositório na última sincronização." />
      ) : (
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-lg bg-surface/60 shadow-[inset_0_0_0_1px_var(--color-line)]" role="tabpanel">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((item, i) => {
              const { icon, tone } = itemIcon(item);
              return (
                <motion.li key={item.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, delay: Math.min(i, 12) * 0.018 }}>
                  <button type="button" onClick={() => setDetail(item)} className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/60 sm:px-5">
                    <span className={cn("mt-0.5 shrink-0 [&_svg]:size-4", tone)} aria-hidden>
                      {icon}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="line-clamp-2 text-body-sm font-medium text-fg-strong">
                        {item.number !== null && <span className="font-numeric mr-1.5 text-fg-subtle">#{item.number}</span>}
                        {item.title}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption tracking-normal text-fg-subtle">
                        <Avatar src={item.authorAvatarUrl} login={item.authorLogin} />
                        {item.authorLogin && <span className="text-fg-muted">{item.authorLogin}</span>}
                        {item.kind === "commit" && typeof item.metadata.sha === "string" && <span className="font-mono">{item.metadata.sha}</span>}
                        {item.kind === "release" && typeof item.metadata.tag === "string" && <span className="font-mono">{item.metadata.tag}</span>}
                        <span suppressHydrationWarning>{formatRelative(item.occurredAt)}</span>
                      </span>
                    </span>
                    {stateLabel(item) && <span className={cn("hidden shrink-0 pt-0.5 text-caption tracking-normal sm:inline", tone)}>{stateLabel(item)}</span>}
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        size="lg"
        title={detail ? `${detail.number !== null ? `#${detail.number} ` : ""}${detail.title}` : ""}
        description={detail ? `${GITHUB_ACTIVITY_LABELS[detail.kind].one}${detail.authorLogin ? ` · ${detail.authorLogin}` : ""}` : undefined}
        footer={
          detail && (
            <a href={detail.url} target="_blank" rel="noreferrer noopener" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-surface-2 px-3.5 text-body-sm font-medium text-fg-strong shadow-[inset_0_0_0_1px_var(--color-line-2)] transition-colors hover:bg-surface-3">
              Abrir no GitHub
              <ArrowUpRight className="size-4" />
            </a>
          )
        }
      >
        {detail && (
          <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-2 gap-4 text-body-sm">
              {stateLabel(detail) && (
                <div className="flex flex-col gap-1">
                  <dt className="eyebrow">Estado</dt>
                  <dd>
                    <Badge>{stateLabel(detail)}</Badge>
                  </dd>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <dt className="eyebrow">{detail.kind === "commit" ? "Data" : "Aberto em"}</dt>
                <dd className="font-numeric text-fg" suppressHydrationWarning>
                  {formatDateTime(detail.occurredAt)}
                </dd>
              </div>
              {detail.closedAt && (
                <div className="flex flex-col gap-1">
                  <dt className="eyebrow">{detail.state === "merged" ? "Integrado em" : "Fechado em"}</dt>
                  <dd className="font-numeric text-fg" suppressHydrationWarning>
                    {formatDateTime(detail.closedAt)}
                  </dd>
                </div>
              )}
              {detail.kind === "pull_request" && typeof detail.metadata.head === "string" && (
                <div className="flex flex-col gap-1">
                  <dt className="eyebrow">Branches</dt>
                  <dd className="font-mono text-[0.75rem] text-fg">
                    {String(detail.metadata.head)} → {String(detail.metadata.base ?? "")}
                  </dd>
                </div>
              )}
              {detail.kind === "issue" && Array.isArray(detail.metadata.labels) && detail.metadata.labels.length > 0 && (
                <div className="col-span-2 flex flex-col gap-1">
                  <dt className="eyebrow">Labels</dt>
                  <dd className="flex flex-wrap gap-1">
                    {(detail.metadata.labels as string[]).map((l) => (
                      <Badge key={l}>{l}</Badge>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
            {detail.body ? (
              <pre className="max-h-80 overflow-auto rounded-md bg-sunken p-4 font-sans text-body-sm whitespace-pre-wrap text-fg shadow-[inset_0_0_0_1px_var(--color-line)]">{detail.body}</pre>
            ) : (
              <p className="text-body-sm text-fg-subtle italic">Sem descrição.</p>
            )}
          </div>
        )}
      </Modal>
    </section>
  );
}
