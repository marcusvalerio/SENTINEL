"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { convertPreProject } from "@/server/pre-projects/actions";

export function ConvertButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <Button
      variant="primary"
      loading={pending}
      trailing={!pending && <ArrowRight />}
      onClick={() =>
        startTransition(async () => {
          const result = await convertPreProject(id);
          if (!result.ok) {
            toast.show({ tone: "error", title: "Não foi possível converter", description: result.error });
            return;
          }
          router.push(result.href);
        })
      }
    >
      Converter em projeto
    </Button>
  );
}
