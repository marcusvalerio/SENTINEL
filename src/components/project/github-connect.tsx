"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Check, GitBranch, GitCommitHorizontal, GitPullRequest, Lock, Tag, TriangleAlert, Unplug, Users } from "lucide-react";
import { useState, useTransition } from "react";
import { GithubMark } from "@/components/brand/github-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { parseRepositoryRef } from "@/domain/github";
import { formatDateTime } from "@/lib/format";
import { connectRepository, disconnectRepository } from "@/server/github/actions";

type Connection = {
  owner: string;
  name: string;
  url: string;
  defaultBranch: string | null;
  isPrivate: boolean | null;
  verified: boolean;
  connectedAt: string;
  lastSyncedAt: string | null;
};

const FUTURE_SIGNALS = [
  { icon: <GitCommitHorizontal />, label: "Commits" },
  { icon: <GitBranch />, label: "Branches" },
  { icon: <GitPullRequest />, label: "Pull requests" },
  { icon: <Tag />, label: "Releases" },
  { icon: <Users />, label: "Contribuidores" },
];

/** Connecting state: the GitHub mark "handshakes" with the SENTINEL aperture. */
function Connecting() {
  return (
    <div className="flex items-center gap-3 text-body-sm text-fg-muted" role="status">
      <span className="relative flex items-center">
        <GithubMark className="size-4 text-fg-strong" />
        <span className="mx-1.5 flex gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.span key={i} className="size-1 rounded-full bg-accent" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
          ))}
        </span>
        <span className="size-3 rounded-full shadow-[inset_0_0_0_1.5px_var(--color-fg-strong)]" aria-hidden />
      </span>
      Verificando repositório…
    </div>
  );
}

export function GithubConnect({ projectId, projectName, connection }: { projectId: string; projectName: string; connection: Connection | null }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const parsed = parseRepositoryRef(value);

  const connect = () =>
    startTransition(async () => {
      const result = await connectRepository(projectId, value);
      if (!result.ok) {
        setError(result.fieldErrors?.repository ? result.error : result.error);
        return;
      }
      setError(null);
      setValue("");
      setEditing(false);
      toast.show(
        result.verified
          ? { title: "Repositório conectado", description: "Verificado no GitHub. A conexão entrou na timeline." }
          : { tone: "info", title: "Repositório conectado sem verificação", description: "Não foi possível consultar o GitHub agora. Os dados serão confirmados na primeira sincronização." },
      );
    });

  const disconnect = () =>
    startTransition(async () => {
      setConfirmOpen(false);
      const result = await disconnectRepository(projectId);
      toast.show(result.ok ? { title: "Repositório desconectado" } : { tone: "error", title: "Não foi possível desconectar", description: result.error });
    });

  const form = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        connect();
      }}
      className="flex w-full max-w-lg flex-col gap-3 text-left"
    >
      <FormField label="Repositório" error={error} hint="dono/repositório ou a URL completa. Um projeto tem exatamente um repositório.">
        <Input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="marcusvalerio/lunar-wms"
          leading={<GithubMark />}
          autoComplete="off"
          spellCheck={false}
          className="font-mono text-[0.8125rem]"
          autoFocus={editing}
        />
      </FormField>
      <AnimatePresence initial={false}>
        {parsed && !pending && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 overflow-hidden text-caption tracking-normal text-fg-muted">
            <Check className="size-3.5 text-success" aria-hidden />
            Será conectado: <span className="font-mono text-fg-strong">{parsed.owner}/{parsed.name}</span>
          </motion.p>
        )}
      </AnimatePresence>
      <div className="flex items-center gap-2">
        {pending ? (
          <Connecting />
        ) : (
          <>
            <Button type="submit" variant="primary" disabled={!parsed} leading={<GithubMark />}>
              Conectar repositório
            </Button>
            {editing && (
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            )}
          </>
        )}
      </div>
    </form>
  );

  if (!connection || editing) {
    return (
      <EmptyState
        icon={<GithubMark className="size-5" />}
        title={editing ? "Trocar repositório" : "Este projeto ainda não possui um repositório conectado."}
        description={`Conecte o repositório de ${projectName}. A atividade de desenvolvimento aparecerá aqui — separada do progresso do projeto.`}
        action={form}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="overflow-hidden rounded-lg bg-surface shadow-[inset_0_0_0_1px_var(--color-line-2)]">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-sunken shadow-[inset_0_0_0_1px_var(--color-line-2)]">
            <GithubMark className="size-6 text-fg-strong" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <a href={connection.url} target="_blank" rel="noreferrer noopener" className="group flex w-fit items-center gap-1.5 font-mono text-[0.9375rem] text-fg-strong">
              <span className="text-fg-muted">{connection.owner}/</span>
              {connection.name}
              <ArrowUpRight className="size-4 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </a>
            <div className="flex flex-wrap items-center gap-1.5">
              {connection.verified ? <Badge tone="success" icon={<Check />}>Verificado</Badge> : <Badge tone="gold" icon={<TriangleAlert />}>Não verificado</Badge>}
              {connection.isPrivate && <Badge icon={<Lock />}>Privado</Badge>}
              {connection.defaultBranch && <Badge icon={<GitBranch />}>{connection.defaultBranch}</Badge>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              Trocar
            </Button>
            <Button variant="danger" size="sm" leading={<Unplug />} onClick={() => setConfirmOpen(true)} loading={pending}>
              Desconectar
            </Button>
          </div>
        </div>
        <dl className="grid border-t border-line text-body-sm sm:grid-cols-2 sm:divide-x sm:divide-line max-sm:divide-y max-sm:divide-line">
          <div className="flex flex-col gap-1 px-5 py-3.5 sm:px-6">
            <dt className="eyebrow">Conectado em</dt>
            <dd className="font-numeric text-fg" suppressHydrationWarning>{formatDateTime(connection.connectedAt)}</dd>
          </div>
          <div className="flex flex-col gap-1 px-5 py-3.5 sm:px-6">
            <dt className="eyebrow">Última sincronização</dt>
            <dd className="text-fg-muted" suppressHydrationWarning>{connection.lastSyncedAt ? formatDateTime(connection.lastSyncedAt) : "Ainda não sincronizado"}</dd>
          </div>
        </dl>
      </div>

      <section className="flex flex-col gap-4" aria-labelledby="activity-heading">
        <div className="flex flex-col gap-1">
          <h2 id="activity-heading" className="font-display text-h4 font-medium text-fg-strong">Atividade de desenvolvimento</h2>
          <p className="text-body-sm text-fg-muted">A sincronização trará estes sinais — sempre como atividade, nunca como percentual de conclusão.</p>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {FUTURE_SIGNALS.map((signal) => (
            <li key={signal.label} className="flex flex-col gap-3 rounded-md p-4 shadow-[inset_0_0_0_1px_var(--color-line)] [background-image:repeating-linear-gradient(135deg,transparent_0_10px,rgb(212_207_214/0.015)_10px_11px)]">
              <span className="text-fg-subtle [&_svg]:size-4">{signal.icon}</span>
              <span className="flex flex-col">
                <span className="text-body-sm text-fg">{signal.label}</span>
                <span className="font-numeric text-h3 text-fg-subtle">—</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={disconnect}
        title="Desconectar repositório?"
        description={`${connection.owner}/${connection.name} deixará de estar associado a este projeto. O registro da conexão permanece na timeline.`}
        confirmLabel="Desconectar"
      />
    </div>
  );
}
