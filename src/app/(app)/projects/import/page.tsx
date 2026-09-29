import type { Metadata } from "next";
import { ImportFlow } from "@/components/import/import-flow";
import { Reveal } from "@/components/motion/reveal";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Importar do GitHub" };

export default async function ImportPage() {
  await requireUser();
  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-12 px-4 pt-14 pb-10 sm:px-6 sm:pt-20 lg:px-8">
      <Reveal className="flex flex-col gap-3">
        <p className="eyebrow">Importar do GitHub</p>
        <h1 className="text-display">Comece pelo que já existe.</h1>
        <p className="max-w-[60ch] text-body text-fg-muted">
          O SENTINEL lê o repositório — README, dependências, estrutura, migrations e commits — e sugere o registro. O que foi lido aparece como <span className="text-success">detectado</span>; o que ele concluiu, como <span className="text-warning">inferido</span>.
        </p>
      </Reveal>
      <ImportFlow hasToken={Boolean(process.env.GITHUB_TOKEN)} />
    </div>
  );
}
