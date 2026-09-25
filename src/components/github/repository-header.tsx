"use client";

import { ArrowUpRight, Check, GitBranch, Lock, TriangleAlert, Unplug } from "lucide-react";
import { useState, useTransition } from "react";
import { GithubMark } from "@/components/brand/github-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { SyncStatus } from "@/domain/github-activity";
import { formatRelative } from "@/lib/format";
import { disconnectRepository } from "@/server/github/actions";
import { ConnectRepository } from "./connect-repository";
import { SyncButton } from "./sync-button";
import { SyncStatusLine } from "./sync-status";

export type ConnectionView = {
  owner: string;
  name: string;
  url: string;
  description: string | null;
  defaultBranch: string | null;
  isPrivate: boolean | null;
  verified: boolean;
  lastPushedAt: string | null;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
};

export function RepositoryHeader({ projectId, projectName, connection }: { projectId: string; projectName: string; connection: ConnectionView }) {
  const [replacing, setReplacing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const full = `${connection.owner}/${connection.name}`;

  if (replacing) return <ConnectRepository projectId={projectId} projectName={projectName} replacing={full} onCancel={() => setReplacing(false)} />;

  const disconnect = () =>
    startTransition(async () => {
      setConfirmOpen(false);
      const result = await disconnectRepository(projectId);
      toast.show(result.ok ? { title: "Repositório desconectado" } : { tone: "error", title: "Não foi possível desconectar", description: result.error });
    });

  return (
    <div className="overflow-hidden rounded-lg bg-surface shadow-[inset_0_0_0_1px_var(--color-line-2)]">
      <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-sunken shadow-[inset_0_0_0_1px_var(--color-line-2)]">
          <GithubMark className="size-6 text-fg-strong" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <a href={connection.url} target="_blank" rel="noreferrer noopener" className="group flex w-fit max-w-full items-center gap-1.5 font-mono text-[0.9375rem] text-fg-strong">
            <span className="truncate">
              <span className="text-fg-muted">{connection.owner}/</span>
              {connection.name}
            </span>
            <ArrowUpRight className="size-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
          </a>
          {connection.description && <p className="max-w-[70ch] text-body-sm text-fg-muted">{connection.description}</p>}
          <div className="flex flex-wrap items-center gap-1.5">
            {connection.verified ? <Badge tone="success" icon={<Check />}>Verificado</Badge> : <Badge tone="gold" icon={<TriangleAlert />}>Não verificado</Badge>}
            {connection.isPrivate && <Badge icon={<Lock />}>Privado</Badge>}
            {connection.defaultBranch && <Badge icon={<GitBranch />}>{connection.defaultBranch}</Badge>}
            {connection.lastPushedAt && (
              <span className="text-caption tracking-normal text-fg-subtle" suppressHydrationWarning>
                último push {formatRelative(connection.lastPushedAt)}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <SyncButton projectId={projectId} variant="primary" />
          <Button variant="ghost" size="sm" onClick={() => setReplacing(true)}>
            Trocar
          </Button>
          <Button variant="danger" size="sm" leading={<Unplug />} onClick={() => setConfirmOpen(true)} loading={pending}>
            Desconectar
          </Button>
        </div>
      </div>
      <div className="border-t border-line px-5 py-3.5 sm:px-6">
        <SyncStatusLine status={connection.syncStatus} lastSyncedAt={connection.lastSyncedAt} error={connection.syncError} />
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={disconnect}
        title="Desconectar repositório?"
        description={`${full} deixará de estar associado a este projeto e a atividade sincronizada será removida. O registro da conexão permanece na timeline.`}
        confirmLabel="Desconectar"
      />
    </div>
  );
}
