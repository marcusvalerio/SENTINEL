"use client";

import { motion } from "motion/react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { syncRepository } from "@/server/github/actions";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Sync runs in the background of the page: only this button shows progress. */
export function SyncButton({ projectId, size = "sm", variant = "secondary" }: { projectId: string; size?: "sm" | "md"; variant?: "secondary" | "primary" }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const sync = () =>
    startTransition(async () => {
      const result = await syncRepository(projectId);
      if (!result.ok) {
        toast.show({ tone: "error", title: "Sincronização falhou", description: result.error });
        router.refresh();
        return;
      }
      const c = result.counts;
      toast.show({
        title: "Repositório sincronizado",
        description: [plural(c.commit ?? 0, "commit", "commits"), plural(c.pull_request ?? 0, "pull request", "pull requests"), plural(c.issue ?? 0, "issue", "issues"), plural(c.release ?? 0, "release", "releases")].join(" · "),
      });
    });

  return (
    <Button
      variant={variant}
      size={size}
      onClick={sync}
      disabled={pending}
      aria-live="polite"
      leading={
        <motion.span animate={pending ? { rotate: 360 } : { rotate: 0 }} transition={pending ? { repeat: Infinity, duration: 0.9, ease: "linear" } : { duration: 0.3 }} className="flex">
          <RefreshCw />
        </motion.span>
      }
    >
      {pending ? "Sincronizando…" : "Sincronizar agora"}
    </Button>
  );
}
