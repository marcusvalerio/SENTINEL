import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardList, PencilLine } from "lucide-react";
import { GithubMark } from "@/components/brand/github-mark";
import { CadenceStrip } from "@/components/command-center/cadence-strip";
import { AttentionList, MilestoneAgenda, ProjectRows, RecentEvents, Section } from "@/components/command-center/sections";
import { SummaryLine } from "@/components/command-center/summary-line";
import { Reveal } from "@/components/motion/reveal";
import { COLLECTION_STATUSES, type ProjectCollection } from "@/domain/project";
import { requireUser } from "@/server/auth/session";
import { countInbox } from "@/server/ideas/queries";
import { loadCommandCenter } from "@/server/intelligence/overview";

export const metadata: Metadata = { title: "Command Center" };

function greeting(name: string) {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(new Date()));
  const part = hour < 5 ? "Boa noite" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return `${part}, ${name.split(" ")[0]}.`;
}

function todayLabel() {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date());
}

const ENTRY_PATHS = [
  { href: "/projects/new", icon: <PencilLine />, title: "Criar manualmente", text: "Registre o nascimento de um projeto, etapa por etapa." },
  { href: "/projects/import", icon: <GithubMark className="size-4" />, title: "Importar do GitHub", text: "Analise um repositório e comece com o contexto já preenchido." },
  { href: "/pre-projects/new", icon: <ClipboardList />, title: "Pré-projeto", text: "Registre uma demanda antes de assumir o compromisso." },
];

export default async function CommandCenterPage() {
  const user = await requireUser();
  const [cc, inbox] = await Promise.all([loadCommandCenter(user.id), countInbox(user.id)]);
  const count = (c: Exclude<ProjectCollection, "all">) => cc.projects.filter((p) => COLLECTION_STATUSES[c].includes(p.status)).length;
  const active = count("active");
  const moving = cc.projects.filter((p) => COLLECTION_STATUSES.active.includes(p.status)).slice(0, 6);

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col px-4 pt-12 pb-28 sm:px-6 sm:pt-16 lg:px-8">
      <Reveal className="flex flex-col gap-5">
        <p className="eyebrow first-letter:uppercase">{todayLabel()}</p>
        <h1 className="text-display sm:text-hero">{greeting(user.name)}</h1>
        {cc.projects.length > 0 && <SummaryLine active={active} attention={cc.attention.length} commits={cc.commits30d} />}
      </Reveal>

      {cc.projects.length === 0 ? (
        <Reveal delay={0.1} className="mt-16 flex flex-col gap-8">
          <div className="rule-fade" />
          <div className="flex flex-col gap-2">
            <h2 className="text-h2">Seu espaço está pronto.</h2>
            <p className="max-w-[56ch] text-body text-fg-muted">Tudo o que você criar a partir de agora terá contexto, história e memória. Por onde começamos?</p>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-xl bg-line sm:grid-cols-3">
            {ENTRY_PATHS.map((p) => (
              <li key={p.href} className="bg-canvas">
                <Link href={p.href} className="group row-hover flex h-full flex-col gap-3 p-6">
                  <span className="text-accent [&_svg]:size-4">{p.icon}</span>
                  <span className="font-display text-h4 font-medium text-fg-strong">{p.title}</span>
                  <span className="text-body-sm text-fg-muted">{p.text}</span>
                  <ArrowRight className="mt-auto size-4 text-fg-subtle transition-transform duration-200 group-hover:translate-x-1 group-hover:text-accent" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      ) : (
        <div className="mt-14 grid gap-x-16 gap-y-14 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-14">
            <Reveal delay={0.08}>
              <Section title="O que precisa da sua atenção" id="attention">
                <AttentionList
                  items={cc.attention.slice(0, 8)}
                  empty={
                    <p className="flex items-center gap-3 text-body text-fg-muted">
                      <span className="size-1.5 rounded-full bg-success" aria-hidden />
                      Nada pede sua atenção agora. Todos os sinais estão calmos.
                    </p>
                  }
                />
              </Section>
            </Reveal>

            <Reveal delay={0.14}>
              <Section
                title="Em movimento"
                id="moving"
                action={
                  <Link href="/projects" className="group flex items-center gap-1.5 text-caption tracking-normal text-fg-muted hover:text-fg-strong">
                    Todos os projetos
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                }
              >
                {moving.length ? <ProjectRows items={moving} /> : <p className="text-body-sm text-fg-subtle">Nenhum projeto ativo no momento.</p>}
              </Section>
            </Reveal>
          </div>

          <aside className="flex min-w-0 flex-col gap-12">
            <Reveal delay={0.1}>
              <Section title="Universo" id="universe">
                <dl className="grid grid-cols-3 gap-y-6">
                  {[
                    { label: "Ativos", value: active, href: "/projects?view=active" },
                    { label: "Em pausa", value: count("paused"), href: "/projects?view=paused" },
                    { label: "Concluídos", value: count("completed"), href: "/projects?view=completed" },
                    { label: "Pré-projetos", value: cc.pipeline, href: "/pre-projects" },
                    { label: "Ideias na Inbox", value: inbox, href: "/inbox" },
                    { label: "Arquivados", value: count("archived"), href: "/projects?view=archived" },
                  ].map((item) => (
                    <Link key={item.label} href={item.href} className="group flex flex-col gap-1">
                      <dd className={`font-numeric font-display text-h1 leading-none font-normal tracking-[-0.03em] transition-colors group-hover:text-accent ${item.value ? "text-fg-strong" : "text-fg-subtle/60"}`}>{item.value}</dd>
                      <dt className="text-caption tracking-normal text-fg-subtle">{item.label}</dt>
                    </Link>
                  ))}
                </dl>
              </Section>
            </Reveal>

            <Reveal delay={0.16}>
              <Section title="Desenvolvimento · 30 dias" id="dev">
                <CadenceStrip days={cc.cadence} />
                <p className="text-caption tracking-normal text-fg-subtle">Commits sincronizados de todos os repositórios. Atividade — não progresso.</p>
              </Section>
            </Reveal>

            <Reveal delay={0.2}>
              <Section title="Próximos milestones" id="milestones">
                <MilestoneAgenda items={cc.milestones} />
              </Section>
            </Reveal>

            <Reveal delay={0.24}>
              <Section title="Atividade recente" id="recent">
                <RecentEvents items={cc.events} />
              </Section>
            </Reveal>
          </aside>
        </div>
      )}
    </div>
  );
}
