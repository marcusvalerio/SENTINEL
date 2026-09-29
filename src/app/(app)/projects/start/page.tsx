import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardList, PencilLine } from "lucide-react";
import { GithubMark } from "@/components/brand/github-mark";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = { title: "Novo projeto" };

const PATHS = [
  {
    href: "/projects/new",
    icon: <PencilLine />,
    title: "Criar manualmente",
    text: "Registre o nascimento do projeto em seis etapas: identidade, contexto, escopo, design, negócio e observações.",
    meta: "Quando a ideia está na sua cabeça",
  },
  {
    href: "/projects/import",
    icon: <GithubMark className="size-4" />,
    title: "Importar do GitHub",
    text: "Escolha um repositório. O SENTINEL lê README, dependências, estrutura e commits, e sugere o registro — separando o que detectou do que inferiu.",
    meta: "Quando o código já existe",
  },
  {
    href: "/pre-projects/new",
    icon: <ClipboardList />,
    title: "Pré-projeto",
    text: "Alguém pediu um sistema? Registre a demanda, faça a descoberta e só vire projeto quando for aprovado.",
    meta: "Quando ainda é uma conversa",
  },
];

export default function StartProjectPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-12 px-4 pt-14 pb-28 sm:px-6 sm:pt-20 lg:px-8">
      <Reveal className="flex flex-col gap-4">
        <p className="eyebrow">Novo projeto</p>
        <h1 className="text-display sm:text-hero">Por onde ele começa?</h1>
        <p className="max-w-[56ch] text-body text-fg-muted">Todo projeto tem uma origem. Escolha a que descreve este momento.</p>
      </Reveal>
      <ul className="flex flex-col">
        {PATHS.map((p, i) => (
          <Reveal as="li" key={p.href} delay={0.08 + i * 0.06} className="border-t border-line">
              <Link href={p.href} className="group row-hover -mx-4 grid gap-4 rounded-lg px-4 py-8 sm:grid-cols-[48px_minmax(0,1fr)_200px_24px] sm:items-center sm:gap-8">
                <span className="flex size-11 items-center justify-center rounded-full text-accent shadow-[inset_0_0_0_1px_var(--color-line-2)] transition-shadow duration-300 group-hover:shadow-[inset_0_0_0_1px_rgb(215_196_133/0.5)] [&_svg]:size-4">{p.icon}</span>
                <span className="flex flex-col gap-1.5">
                  <span className="font-display text-h2 font-normal tracking-[-0.02em] text-fg-strong">{p.title}</span>
                  <span className="max-w-[60ch] text-body text-fg-muted">{p.text}</span>
                </span>
                <span className="text-body-sm text-fg-subtle">{p.meta}</span>
                <ArrowRight className="hidden size-5 text-fg-subtle transition-all duration-300 group-hover:translate-x-1 group-hover:text-accent sm:block" aria-hidden />
              </Link>
          </Reveal>
        ))}
      </ul>
    </div>
  );
}
