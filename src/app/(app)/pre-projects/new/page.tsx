import type { Metadata } from "next";
import { Reveal } from "@/components/motion/reveal";
import { PreProjectQuestionnaire } from "@/components/pre-projects/questionnaire";
import { emptyPreProject } from "@/domain/pre-projects";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Novo pré-projeto" };

export default async function NewPreProjectPage() {
  await requireUser();
  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-14 px-4 pt-14 pb-10 sm:px-6 sm:pt-20 lg:px-8">
      <Reveal className="flex flex-col gap-3">
        <p className="eyebrow">Novo pré-projeto</p>
        <h1 className="text-display">Alguém pediu um sistema.</h1>
        <p className="max-w-[58ch] text-body text-fg-muted">Registre a conversa enquanto ela está fresca. Responda o que souber — o resto vem com a descoberta.</p>
      </Reveal>
      <PreProjectQuestionnaire id={null} initial={emptyPreProject()} />
    </div>
  );
}
