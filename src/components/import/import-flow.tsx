"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Lock, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { GithubMark } from "@/components/brand/github-mark";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/choice";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ProvenanceTag } from "@/components/ui/provenance";
import { useToast } from "@/components/ui/toast";
import { parseRepositoryRef } from "@/domain/github";
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS } from "@/domain/project";
import type { RepoAnalysis } from "@/domain/repo-analysis";
import { STACK_CATEGORIES, STACK_CATEGORY_LABELS } from "@/domain/stack";
import { cn } from "@/lib/cn";
import { formatDate, formatRelative } from "@/lib/format";
import { listRepositories, type RepositoryOption } from "@/server/github/actions";
import { analyzeRepositoryForImport, createImportDraft } from "@/server/import/actions";

type Stage = "pick" | "analyzing" | "preview";

const READS = ["Metadados do repositório", "README", "package.json", "Estrutura de arquivos", "Linguagens", "Commits e branches"];

/** While analysis runs, show what is actually being read — calm, sequential, honest. */
function AnalyzingState({ reference }: { reference: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, READS.length - 1)), 420);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-start gap-8 py-10" role="status" aria-live="polite">
      <div className="flex items-center gap-4">
        <span className="relative flex size-12 items-center justify-center">
          <motion.span className="absolute inset-0 rounded-full border border-accent/40" animate={{ scale: [1, 1.35], opacity: [0.6, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }} />
          <GithubMark className="size-6 text-fg-strong" />
        </span>
        <div className="flex flex-col">
          <span className="text-body text-fg-strong">Lendo {reference}</span>
          <span className="text-body-sm text-fg-muted">Somente leitura. Nada é alterado no repositório.</span>
        </div>
      </div>
      <ol className="flex flex-col gap-2.5">
        {READS.map((r, i) => (
          <motion.li key={r} initial={{ opacity: 0, x: -6 }} animate={{ opacity: i <= step ? 1 : 0.35, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 text-body-sm">
            <span className={cn("flex size-4 items-center justify-center rounded-full", i < step ? "bg-success/20 text-success" : "text-fg-subtle")}>
              {i < step ? <Check className="size-3" /> : <span className={cn("size-1.5 rounded-full", i === step ? "animate-pulse bg-accent" : "bg-fg-subtle/50")} />}
            </span>
            <span className={i <= step ? "text-fg" : "text-fg-subtle"}>{r}</span>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 border-t border-line py-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-8">
      <dt className="text-body-sm text-fg-subtle">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function Preview({ analysis, onBack }: { analysis: RepoAnalysis; onBack: () => void }) {
  const [includeFeatures, setIncludeFeatures] = useState(true);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const s = analysis.suggestion;
  const full = `${analysis.repository.owner}/${analysis.repository.name}`;
  const byCategory = STACK_CATEGORIES.map((c) => ({ c, items: analysis.stack.filter((i) => i.category === c) })).filter((g) => g.items.length);

  const create = () =>
    startTransition(async () => {
      const result = await createImportDraft(full, { includeFeatures });
      if (!result.ok) {
        toast.show({ tone: "error", title: "Não foi possível preparar o projeto", description: result.error });
        return;
      }
      router.push(result.href);
    });

  const suggestion = (label: string, value: { value: string; provenance: "detected" | "inferred" | "user"; evidence: string } | null, render?: (v: string) => string) => (
    <Row label={label}>
      {value ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-start gap-2">
            <span className="text-body text-fg-strong">{render ? render(value.value) : value.value}</span>
            <ProvenanceTag value={value.provenance} />
          </div>
          <span className="text-caption tracking-normal text-fg-subtle">{value.evidence}</span>
        </div>
      ) : (
        <span className="text-body-sm text-fg-subtle italic">Sem evidência no repositório — você informa na revisão.</span>
      )}
    </Row>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col gap-12">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-2 font-mono text-[0.8125rem] text-fg-muted">
            <GithubMark className="size-4" />
            {full}
            {analysis.repository.isPrivate && <Lock className="size-3" aria-label="Privado" />}
          </span>
          <h2 className="text-h1">{s.name?.value ?? analysis.repository.name}</h2>
          <p className="text-body-sm text-fg-subtle" suppressHydrationWarning>
            {analysis.activity.commits} commits recentes lidos · {analysis.activity.branches} branches
            {analysis.activity.lastCommitAt && <> · último commit {formatRelative(analysis.activity.lastCommitAt)}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-caption tracking-normal text-fg-muted">
          <span className="flex items-center gap-1.5"><ProvenanceTag value="detected" /> lido do repositório</span>
          <span className="flex items-center gap-1.5"><ProvenanceTag value="inferred" /> conclusão do SENTINEL</span>
        </div>
      </div>

      <section className="flex flex-col" aria-labelledby="suggested">
        <h3 id="suggested" className="eyebrow mb-2">Registro sugerido</h3>
        <dl>
          {suggestion("Nome", s.name)}
          {suggestion("Descrição curta", s.summary)}
          {suggestion("Objetivo principal", s.primaryGoal)}
          {suggestion("Tipo", s.type, (v) => PROJECT_TYPE_LABELS[v as keyof typeof PROJECT_TYPE_LABELS] ?? v)}
          {suggestion("Status", s.status, (v) => PROJECT_STATUS_LABELS[v as keyof typeof PROJECT_STATUS_LABELS] ?? v)}
          {suggestion("Início", s.startedOn, (v) => formatDate(v, "long"))}
        </dl>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="stack">
        <h3 id="stack" className="eyebrow">Stack</h3>
        {byCategory.length === 0 ? (
          <p className="text-body-sm text-fg-subtle">Nenhuma tecnologia identificada.</p>
        ) : (
          <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
            {byCategory.map(({ c, items }) => (
              <div key={c} className="flex flex-col gap-2">
                <dt className="text-caption tracking-normal text-fg-subtle">{STACK_CATEGORY_LABELS[c]}</dt>
                <dd className="flex flex-col gap-1.5">
                  {items.map((i) => (
                    <span key={i.name} className="flex items-center justify-between gap-3 text-body-sm" title={i.evidence}>
                      <span className="text-fg">{i.name}</span>
                      <ProvenanceTag value={i.provenance} title={i.evidence} />
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <div className="grid gap-12 md:grid-cols-2">
        <section className="flex flex-col gap-3" aria-labelledby="features">
          <h3 id="features" className="eyebrow">Funcionalidades mencionadas</h3>
          {analysis.features.length === 0 ? (
            <p className="text-body-sm text-fg-subtle">O README não tem uma seção de funcionalidades.</p>
          ) : (
            <>
              <ul className="flex flex-col gap-1.5">
                {analysis.features.slice(0, 12).map((f) => (
                  <li key={f.label} className="flex items-start gap-2 text-body-sm text-fg">
                    <span className="mt-[7px] size-1 shrink-0 rounded-full bg-fg-subtle" aria-hidden />
                    {f.label}
                  </li>
                ))}
              </ul>
              <span className="text-caption tracking-normal text-fg-subtle">Fonte: {analysis.features[0]?.evidence}</span>
              <Checkbox checked={includeFeatures} onChange={(e) => setIncludeFeatures(e.target.checked)} label="Trazer para o escopo do projeto" />
            </>
          )}
        </section>
        <section className="flex flex-col gap-3" aria-labelledby="modules">
          <h3 id="modules" className="eyebrow flex items-center gap-2">
            Módulos <ProvenanceTag value="inferred" />
          </h3>
          {analysis.modules.length === 0 ? (
            <p className="text-body-sm text-fg-subtle">Nenhuma rota ou pasta de módulo identificável.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {analysis.modules.map((m) => (
                <span key={m.label} title={m.evidence} className="rounded-xs px-2 py-1 font-mono text-[0.75rem] text-fg-muted shadow-[inset_0_0_0_1px_var(--color-line-2)]">
                  {m.label}
                </span>
              ))}
            </div>
          )}
          <span className="text-caption tracking-normal text-fg-subtle">Inferidos pelas rotas e pastas — uma rota sugere um módulo, não o comprova.</span>
        </section>
      </div>

      <dl className="grid gap-8 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <dt className="eyebrow">Documentação</dt>
          <dd className="text-body-sm text-fg">{analysis.documentation.length ? analysis.documentation.slice(0, 5).map((d) => d.label).join(", ") : <span className="text-fg-subtle">Nenhuma</span>}</dd>
        </div>
        <div className="flex flex-col gap-1.5">
          <dt className="eyebrow">Migrations</dt>
          <dd className="text-body-sm text-fg">{analysis.migrations ? `${analysis.migrations.count} arquivos · ${analysis.migrations.tool}` : <span className="text-fg-subtle">Nenhuma encontrada</span>}</dd>
        </div>
        <div className="flex flex-col gap-1.5">
          <dt className="eyebrow">Ferramentas</dt>
          <dd className="text-body-sm text-fg">{analysis.tools.map((t) => t.name).join(", ")}</dd>
        </div>
      </dl>

      {analysis.notes.length > 0 && (
        <ul className="flex flex-col gap-1 text-body-sm text-warning">
          {analysis.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas/90 px-4 py-4 backdrop-blur-xl sm:mx-0 sm:px-0">
        <Button variant="ghost" leading={<ArrowLeft />} onClick={onBack}>
          Outro repositório
        </Button>
        <div className="flex items-center gap-3">
          <span className="hidden text-caption tracking-normal text-fg-subtle md:inline">Você revisa tudo antes de criar. O repositório é conectado e sincronizado ao final.</span>
          <Button variant="primary" onClick={create} loading={pending} trailing={!pending && <ArrowRight />}>
            Revisar e criar projeto
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export function ImportFlow({ hasToken }: { hasToken: boolean }) {
  const [stage, setStage] = useState<Stage>("pick");
  const [owner, setOwner] = useState("");
  const [manual, setManual] = useState("");
  const [repos, setRepos] = useState<RepositoryOption[] | null>(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [analysis, setAnalysis] = useState<RepoAnalysis | null>(null);
  const [loading, startLoading] = useTransition();

  const load = (who: string) =>
    startLoading(async () => {
      const result = await listRepositories(who);
      if (!result.ok) {
        setError(result.error);
        setRepos(null);
        return;
      }
      setError(null);
      setRepos(result.repositories);
    });

  // With a server token, list the owner's repositories right away.
  useEffect(() => {
    if (hasToken) load("");
  }, [hasToken]);

  const filtered = useMemo(() => (repos ?? []).filter((r) => `${r.owner}/${r.name} ${r.description ?? ""}`.toLowerCase().includes(filter.trim().toLowerCase())), [repos, filter]);

  const analyze = (ref: string) => {
    setReference(ref);
    setStage("analyzing");
    startLoading(async () => {
      const result = await analyzeRepositoryForImport(ref);
      if (!result.ok) {
        setError(result.error);
        setStage("pick");
        return;
      }
      setAnalysis(result.analysis);
      setStage("preview");
    });
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {stage === "pick" && (
        <motion.div key="pick" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.24 }} className="flex flex-col gap-10">
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_300px] md:gap-12">
            <div className="flex flex-col gap-4">
              {hasToken ? (
                <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar nos seus repositórios…" leading={<Search />} aria-label="Buscar repositórios" autoFocus inputSize="lg" />
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    load(owner);
                  }}
                  className="flex flex-col gap-3"
                >
                  <FormField label="Usuário ou organização" hint="Sem GITHUB_TOKEN no servidor, apenas repositórios públicos são listados.">
                    <div className="flex gap-2">
                      <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="marcusvalerio" leading={<GithubMark />} spellCheck={false} className="font-mono text-[0.8125rem]" />
                      <Button type="submit" variant="secondary" loading={loading}>
                        Listar
                      </Button>
                    </div>
                  </FormField>
                  {repos && <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar…" leading={<Search />} aria-label="Filtrar repositórios" />}
                </form>
              )}
              {error && <p role="alert" className="text-body-sm text-danger">{error}</p>}
              {loading && !repos && hasToken && <p className="text-body-sm text-fg-muted">Carregando seus repositórios…</p>}
              {repos && (
                <ul className="flex flex-col">
                  {filtered.length === 0 && <li className="py-6 text-body-sm text-fg-muted">Nenhum repositório encontrado.</li>}
                  {filtered.slice(0, 60).map((r, i) => (
                    <motion.li key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 12) * 0.02 }} className="border-t border-line first:border-t-0">
                      <button type="button" onClick={() => analyze(`${r.owner}/${r.name}`)} className="group row-hover -mx-3 flex w-[calc(100%+1.5rem)] items-center gap-4 rounded-md px-3 py-3.5 text-left">
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex items-center gap-2 font-mono text-[0.8125rem] text-fg-strong">
                            <span className="truncate">
                              <span className="text-fg-subtle">{r.owner}/</span>
                              {r.name}
                            </span>
                            {r.isPrivate && <Lock className="size-3 shrink-0 text-fg-subtle" aria-label="Privado" />}
                          </span>
                          {r.description && <span className="truncate text-body-sm text-fg-muted">{r.description}</span>}
                        </span>
                        {r.pushedAt && (
                          <span className="hidden shrink-0 text-caption tracking-normal text-fg-subtle sm:inline" suppressHydrationWarning>
                            {formatRelative(r.pushedAt)}
                          </span>
                        )}
                        <ArrowRight className="size-4 shrink-0 text-fg-subtle opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden />
                      </button>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const ref = parseRepositoryRef(manual);
                if (ref) analyze(`${ref.owner}/${ref.name}`);
              }}
              className="flex flex-col gap-3 border-line max-md:border-t max-md:pt-8 md:border-l md:pl-12"
            >
              <FormField label="Ou cole o endereço" hint="dono/repositório ou a URL completa.">
                <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="https://github.com/dono/repo" spellCheck={false} className="font-mono text-[0.8125rem]" />
              </FormField>
              <div>
                <Button type="submit" variant="secondary" disabled={!parseRepositoryRef(manual)} trailing={<ArrowRight />}>
                  Analisar
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      )}
      {stage === "analyzing" && (
        <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <AnalyzingState reference={reference} />
        </motion.div>
      )}
      {stage === "preview" && analysis && (
        <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Preview analysis={analysis} onBack={() => setStage("pick")} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
