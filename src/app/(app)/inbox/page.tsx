import type { Metadata } from "next";
import { InboxBoard } from "@/components/inbox/inbox-board";
import { Reveal } from "@/components/motion/reveal";
import { requireUser } from "@/server/auth/session";
import { listIdeas } from "@/server/ideas/queries";
import { listProjectIndex } from "@/server/projects/queries";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage() {
  const user = await requireUser();
  const [ideas, projects] = await Promise.all([listIdeas(user.id), listProjectIndex(user.id)]);
  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-12 px-4 pt-14 pb-28 sm:px-6 sm:pt-20">
      <Reveal className="flex flex-col gap-3">
        <p className="eyebrow">Inbox de ideias</p>
        <h1 className="text-display">Capture agora. Decida depois.</h1>
        <p className="max-w-[56ch] text-body text-fg-muted">Uma linha basta. Mais tarde, cada ideia vira funcionalidade, milestone, projeto — ou vai para o arquivo.</p>
      </Reveal>
      <InboxBoard
        ideas={ideas.map((i) => ({ id: i.id, text: i.text, status: i.status, createdAt: i.createdAt.toISOString(), convertedKind: i.convertedKind, convertedId: i.convertedId, project: i.project?.id ? { id: i.project.id, name: i.project.name } : null }))}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
