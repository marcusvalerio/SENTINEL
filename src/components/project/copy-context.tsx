"use client";

import { ClipboardCopy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/** Copies the project's AI-ready context (Markdown) to the clipboard. */
export function CopyContextButton({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  return (
    <Button
      size="sm"
      variant="ghost"
      leading={<ClipboardCopy />}
      succeeded={copied}
      title="Copia um resumo em Markdown para colar em qualquer assistente de IA"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(markdown);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          toast.show({ tone: "error", title: "Não foi possível copiar.", description: "O navegador bloqueou o acesso à área de transferência." });
        }
      }}
    >
      {copied ? "Contexto copiado" : "Copiar contexto"}
    </Button>
  );
}
