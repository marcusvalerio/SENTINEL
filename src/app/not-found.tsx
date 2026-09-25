import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-xl items-center px-4">
      <EmptyState
        className="w-full"
        icon={<Compass />}
        title="Nada registrado neste endereço."
        description="O projeto pode ter sido removido, ou o link está incompleto."
        action={
          <ButtonLink href="/" variant="secondary" size="sm">
            Voltar aos projetos
          </ButtonLink>
        }
      />
    </main>
  );
}
