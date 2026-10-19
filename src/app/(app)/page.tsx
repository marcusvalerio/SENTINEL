import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ClipboardList, Command, GitBranch, Plus, Sparkles } from "lucide-react";
import { GithubMark } from "@/components/brand/github-mark";
import { LogoMark } from "@/components/brand/logo";
import { CadenceStrip } from "@/components/command-center/cadence-strip";
import { AttentionList, MilestoneAgenda, ProjectRows, RecentEvents } from "@/components/command-center/sections";
import { COLLECTION_STATUSES, type ProjectCollection } from "@/domain/project";
import { requireUser } from "@/server/auth/session";
import { countInbox } from "@/server/ideas/queries";
import { loadCommandCenter } from "@/server/intelligence/overview";

export const metadata: Metadata = { title: "Command Center" };

function todayLabel() {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date());
}

export default async function CommandCenterPage() {
  const user = await requireUser();
  const [cc, inbox] = await Promise.all([loadCommandCenter(user.id), countInbox(user.id)]);
  const count = (c: Exclude<ProjectCollection, "all">) => cc.projects.filter((p) => COLLECTION_STATUSES[c].includes(p.status)).length;
  const active = count("active");
  const moving = cc.projects.filter((p) => COLLECTION_STATUSES.active.includes(p.status)).slice(0, 6);

  return (
    <div className="sentinel-workspace mx-auto w-full max-w-[1600px] px-4 pb-20 pt-5 sm:px-7 lg:px-10">
      <header className="workspace-topline">
        <div className="flex items-center gap-3">
          <span className="workspace-mark"><LogoMark className="size-7" animated={false} /></span>
          <div><p className="workspace-brand">SENTINEL</p><p className="workspace-caption">PROJECT INTELLIGENCE</p></div>
        </div>
        <div className="workspace-date"><span className="workspace-live-dot" />{todayLabel()}</div>
      </header>

      <div className="workspace-intro">
        <div className="workspace-intro-copy">
          <p className="workspace-overline">SEU ESPAÇO DE TRABALHO</p>
          <h1>Ideias em movimento.<br /><span>Projetos com memória.</span></h1>
          <p className="workspace-lede">Um lugar para organizar o que você está construindo, entender o que vem depois e não perder o fio das decisões.</p>
        </div>
        <div className="workspace-intro-art" aria-hidden="true">
          <div className="workspace-art-grid" />
          <div className="workspace-art-orbit workspace-art-orbit-one" />
          <div className="workspace-art-orbit workspace-art-orbit-two" />
          <LogoMark className="workspace-art-logo" animated={false} />
          <span className="workspace-art-index">SV / 001</span>
        </div>
      </div>

      <nav className="workspace-actions" aria-label="Ações rápidas">
        <Link href="/projects/new" className="workspace-action workspace-action-primary"><Plus size={16} /> Novo projeto <ArrowRight size={15} /></Link>
        <Link href="/projects/import" className="workspace-action"><GithubMark className="size-4" /> Conectar repositório</Link>
        <Link href="/pre-projects/new" className="workspace-action"><ClipboardList size={16} /> Registrar demanda</Link>
        <Link href="/inbox" className="workspace-action workspace-action-quiet"><Sparkles size={15} /> Capturar uma ideia <ArrowDownRight size={14} /></Link>
      </nav>

      {cc.projects.length === 0 ? (
        <section className="workspace-first-project">
          <div className="workspace-first-index"><Command size={16} /> PRIMEIRO PASSO</div>
          <h2>Comece por algo que importa.</h2>
          <p>Crie um projeto ou conecte um repositório. O SENTINEL organiza o contexto para que o trabalho não dependa só da sua memória.</p>
          <div className="workspace-first-links">
            <Link href="/projects/new">Criar projeto <ArrowRight size={15} /></Link>
            <Link href="/projects/import">Importar do GitHub <ArrowRight size={15} /></Link>
          </div>
        </section>
      ) : (
        <>
          <section className="workspace-overview" aria-label="Resumo do trabalho">
            <div className="workspace-overview-lead"><span>VISÃO GERAL</span><strong>O trabalho, sem perder o contexto.</strong></div>
            <Link href="/projects?view=active" className="workspace-metric"><span>Em andamento</span><strong>{active.toString().padStart(2, "0")}</strong><small>projetos ativos <ArrowRight size={12} /></small></Link>
            <Link href="/inbox" className="workspace-metric"><span>Ideias capturadas</span><strong>{inbox.toString().padStart(2, "0")}</strong><small>na sua inbox <ArrowRight size={12} /></small></Link>
            <Link href="/pre-projects" className="workspace-metric"><span>Na fila</span><strong>{cc.pipeline.toString().padStart(2, "0")}</strong><small>pré-projetos <ArrowRight size={12} /></small></Link>
          </section>

          <div className="workspace-main-grid">
            <main className="workspace-primary">
              <section className="workspace-project-area">
                <div className="workspace-section-heading">
                  <div><p className="workspace-overline">PORTFÓLIO ATIVO</p><h2>O que está em movimento</h2></div>
                  <Link href="/projects" className="workspace-text-link">Ver todos <ArrowRight size={14} /></Link>
                </div>
                {moving.length ? <div className="workspace-project-list"><ProjectRows items={moving} /></div> : <div className="workspace-empty-inline">Nenhum projeto ativo por enquanto. Use “Novo projeto” para começar.</div>}
              </section>

              <section className="workspace-activity-area">
                <div className="workspace-section-heading">
                  <div><p className="workspace-overline">RITMO DE CONSTRUÇÃO</p><h2>Atividade recente</h2></div>
                  <span className="workspace-period"><GitBranch size={13} /> últimos 30 dias</span>
                </div>
                <div className="workspace-cadence"><CadenceStrip days={cc.cadence} /><p>Commits sincronizados dos repositórios conectados. Atividade não significa, necessariamente, progresso.</p></div>
                <RecentEvents items={cc.events} />
              </section>
            </main>

            <aside className="workspace-rail">
              <section className="workspace-attention">
                <div className="workspace-rail-heading"><span className="workspace-rail-icon"><Sparkles size={15} /></span><div><p className="workspace-overline">SINAIS DO SISTEMA</p><h2>Atenção necessária</h2></div></div>
                <AttentionList items={cc.attention.slice(0, 8)} empty={<p className="workspace-calm"><span />Tudo tranquilo por aqui. Nenhum item precisa da sua atenção agora.</p>} />
              </section>
              <section className="workspace-milestones">
                <div className="workspace-rail-heading"><span className="workspace-rail-icon"><ArrowDownRight size={15} /></span><div><p className="workspace-overline">PRÓXIMOS PASSOS</p><h2>Marcos e entregas</h2></div></div>
                <MilestoneAgenda items={cc.milestones} />
              </section>
              <section className="workspace-universe">
                <p className="workspace-overline">SEU UNIVERSO</p>
                <div className="workspace-universe-grid">
                  {[{label:"Em pausa",value:count("paused"),href:"/projects?view=paused"},{label:"Concluídos",value:count("completed"),href:"/projects?view=completed"},{label:"Arquivados",value:count("archived"),href:"/projects?view=archived"}].map((item)=><Link href={item.href} key={item.label}><strong>{item.value}</strong><span>{item.label}</span></Link>)}
                </div>
              </section>
            </aside>
          </div>
        </>
      )}
      <footer className="workspace-footer"><span>SENTINEL / MEMÓRIA OPERACIONAL</span><span>Seu trabalho, conectado ao seu contexto.</span></footer>
    </div>
  );
}
