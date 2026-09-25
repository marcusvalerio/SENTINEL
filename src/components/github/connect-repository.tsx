"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, Lock, Search } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { GithubMark } from "@/components/brand/github-mark";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { parseRepositoryRef } from "@/domain/github";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/format";
import { connectRepository, listRepositories, type RepositoryOption } from "@/server/github/actions";

type Step = "find" | "pick" | "confirm";

/** Connecting: the GitHub mark "handshakes" with the SENTINEL aperture. */
function Handshake({ label }: { label: string }) {
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
      {label}
    </div>
  );
}

export function ConnectRepository({ projectId, projectName, replacing, onCancel }: { projectId: string; projectName: string; replacing?: string; onCancel?: () => void }) {
  const [step, setStep] = useState<Step>("find");
  const [owner, setOwner] = useState("");
  const [manual, setManual] = useState("");
  const [repos, setRepos] = useState<RepositoryOption[]>([]);
  const [scope, setScope] = useState<"token" | "public">("public");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [connecting, startConnecting] = useTransition();
  const toast = useToast();

  const filtered = useMemo(() => repos.filter((r) => r.name.toLowerCase().includes(filter.trim().toLowerCase())), [repos, filter]);

  const find = () =>
    startLoading(async () => {
      const result = await listRepositories(owner);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setRepos(result.repositories);
      setScope(result.scope);
      setStep("pick");
    });

  const confirm = (reference: string) => {
    setSelected(reference);
    setStep("confirm");
  };

  const connect = () =>
    startConnecting(async () => {
      if (!selected) return;
      const result = await connectRepository(projectId, selected);
      if (!result.ok) {
        setError(result.error);
        setStep("find");
        return;
      }
      toast.show(
        result.synced
          ? { title: "Repositório conectado e sincronizado", description: "A atividade de desenvolvimento já está disponível." }
          : result.verified
            ? { tone: "info", title: "Repositório conectado", description: result.syncError ?? "Use “Sincronizar agora” para trazer a atividade." }
            : { tone: "info", title: "Conectado sem verificação", description: "Não foi possível consultar o GitHub agora. Sincronize em instantes." },
      );
      onCancel?.();
    });

  const selectedRef = selected ? parseRepositoryRef(selected) : null;
  const manualRef = parseRepositoryRef(manual);

  return (
    <div className="overflow-hidden rounded-lg bg-surface shadow-[inset_0_0_0_1px_var(--color-line-2)]">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4 sm:px-6">
        <span className="flex size-9 items-center justify-center rounded-md bg-sunken shadow-[inset_0_0_0_1px_var(--color-line-2)]">
          <GithubMark className="size-4 text-fg-strong" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="font-display text-h4 font-medium text-fg-strong">{replacing ? "Trocar repositório" : "Conectar GitHub"}</h2>
          <p className="truncate text-caption tracking-normal text-fg-subtle">
            {replacing ? `Atual: ${replacing} — a atividade dele será substituída.` : `Um repositório para ${projectName}. A atividade fica separada do progresso.`}
          </p>
        </div>
        <ol className="hidden items-center gap-2 font-mono text-[0.625rem] tracking-[0.08em] uppercase sm:flex" aria-label="Etapas">
          {(["find", "pick", "confirm"] as Step[]).map((s, i) => (
            <li key={s} className={cn("flex items-center gap-2", step === s ? "text-accent" : "text-fg-subtle")}>
              {i > 0 && <span className="h-px w-3 bg-line-3" aria-hidden />}
              {["Buscar", "Escolher", "Confirmar"][i]}
            </li>
          ))}
        </ol>
      </div>

      <div className="p-5 sm:p-6">
        <AnimatePresence mode="wait" initial={false}>
          {step === "find" && (
            <motion.div key="find" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }} className="grid gap-6 md:grid-cols-2 md:gap-8">
              <form
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  find();
                }}
              >
                <FormField label="Usuário ou organização" hint="Lista os repositórios públicos. Com GITHUB_TOKEN no servidor, também os privados." error={error}>
                  <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="marcusvalerio" leading={<GithubMark />} autoComplete="off" spellCheck={false} className="font-mono text-[0.8125rem]" />
                </FormField>
                <div>
                  <Button type="submit" variant="primary" loading={loading} leading={!loading && <Search />}>
                    Buscar repositórios
                  </Button>
                </div>
              </form>
              <form
                className="flex flex-col gap-3 border-line max-md:border-t max-md:pt-6 md:border-l md:pl-8"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manualRef) confirm(`${manualRef.owner}/${manualRef.name}`);
                }}
              >
                <FormField label="Ou cole o endereço" hint="dono/repositório ou a URL completa.">
                  <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="https://github.com/dono/repositorio" autoComplete="off" spellCheck={false} className="font-mono text-[0.8125rem]" />
                </FormField>
                <div className="flex items-center gap-2">
                  <Button type="submit" variant="secondary" disabled={!manualRef}>
                    Continuar
                  </Button>
                  {onCancel && (
                    <Button variant="ghost" onClick={onCancel}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </motion.div>
          )}

          {step === "pick" && (
            <motion.div key="pick" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }} className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button variant="ghost" size="sm" leading={<ArrowLeft />} onClick={() => setStep("find")} className="-ml-2 self-start">
                  Voltar
                </Button>
                <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={`Filtrar ${repos.length} repositórios`} leading={<Search />} aria-label="Filtrar repositórios" autoFocus />
              </div>
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-body-sm text-fg-muted">{repos.length === 0 ? (scope === "public" ? "Nenhum repositório público encontrado para este usuário." : "Nenhum repositório encontrado.") : "Nada corresponde ao filtro."}</p>
              ) : (
                <ul className="flex max-h-[360px] flex-col divide-y divide-line overflow-y-auto rounded-md shadow-[inset_0_0_0_1px_var(--color-line)]">
                  {filtered.map((r) => (
                    <li key={r.id}>
                      <button type="button" onClick={() => confirm(`${r.owner}/${r.name}`)} className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2">
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex items-center gap-2 font-mono text-[0.8125rem] text-fg-strong">
                            <span className="truncate">
                              <span className="text-fg-subtle">{r.owner}/</span>
                              {r.name}
                            </span>
                            {r.isPrivate && <Lock className="size-3 shrink-0 text-fg-subtle" aria-label="Privado" />}
                          </span>
                          {r.description && <span className="truncate text-caption tracking-normal text-fg-muted">{r.description}</span>}
                        </span>
                        {r.pushedAt && (
                          <span className="hidden shrink-0 text-caption tracking-normal text-fg-subtle sm:inline" suppressHydrationWarning>
                            {formatRelative(r.pushedAt)}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}

          {step === "confirm" && selectedRef && (
            <motion.div key="confirm" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-col items-start gap-5">
              <div className="flex w-full items-center gap-4 rounded-md bg-sunken/70 px-4 py-4 shadow-[inset_0_0_0_1px_var(--color-line-2)]">
                <GithubMark className="size-6 text-fg-strong" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-mono text-[0.9375rem] text-fg-strong">
                    <span className="text-fg-muted">{selectedRef.owner}/</span>
                    {selectedRef.name}
                  </span>
                  <span className="text-caption tracking-normal text-fg-subtle">será o repositório de {projectName}</span>
                </div>
              </div>
              <ul className="flex flex-col gap-1.5 text-body-sm text-fg-muted">
                {["Verificamos o repositório no GitHub", "Sincronizamos commits, pull requests, issues, releases, branches e contribuidores", "A conexão entra na timeline do projeto"].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>
              {connecting ? (
                <Handshake label="Conectando e sincronizando…" />
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setStep(repos.length ? "pick" : "find")}>
                    Voltar
                  </Button>
                  <Button variant="primary" onClick={connect} leading={<GithubMark />}>
                    Confirmar e sincronizar
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
