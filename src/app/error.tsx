"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/** Never shows stack traces — only a human message and a way forward. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[sentinel] render error", error.digest ?? "");
  }, [error]);

  return (
    <main id="main" className="mx-auto flex min-h-[70dvh] w-full max-w-xl items-center px-4">
      <EmptyState
        className="w-full"
        icon={<TriangleAlert />}
        title="Algo não saiu como esperado."
        description={
          <>
            Nenhum dado foi perdido. Tente novamente — se persistir, volte aos projetos.
            {error.digest && <span className="mt-3 block font-mono text-[0.6875rem] text-fg-subtle">ref {error.digest}</span>}
          </>
        }
        action={
          <Button variant="secondary" size="sm" leading={<RotateCcw />} onClick={reset}>
            Tentar novamente
          </Button>
        }
        secondary={
          <ButtonLink href="/" variant="ghost" size="sm">
            Ir para projetos
          </ButtonLink>
        }
      />
    </main>
  );
}
