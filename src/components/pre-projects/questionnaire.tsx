"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { PRE_PROJECT_CHAPTERS, type PreProjectField } from "@/domain/pre-projects";
import { cn } from "@/lib/cn";
import { useIsMac } from "@/lib/use-platform";
import { savePreProject } from "@/server/pre-projects/actions";

type Values = Record<"title" | PreProjectField, string>;

/**
 * Discovery questionnaire: five short chapters on one calm page. Nothing is
 * required except a provisional name — discovery is allowed to be partial.
 */
export function PreProjectQuestionnaire({ id, initial, onSaved }: { id: string | null; initial: Values; onSaved?: () => void }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [active, setActive] = useState(PRE_PROJECT_CHAPTERS[0]!.key);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const isMac = useIsMac();

  const answered = (keys: string[]) => keys.filter((k) => values[k as keyof Values]?.trim()).length;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id.replace("chapter-", ""));
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    for (const c of PRE_PROJECT_CHAPTERS) {
      const el = document.getElementById(`chapter-${c.key}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const save = () =>
    startTransition(async () => {
      const result = await savePreProject(id, values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.show({ tone: "error", title: "Revise o pré-projeto", description: result.error });
        document.getElementById("chapter-who")?.scrollIntoView({ behavior: "smooth" });
        return;
      }
      setErrors({});
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
      toast.show({ title: id ? "Pré-projeto atualizado" : "Pré-projeto registrado" });
      if (onSaved) onSaved();
      else router.push(`/pre-projects/${result.id}`);
    });

  return (
    <form
      className="grid gap-12 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-16"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          save();
        }
      }}
    >
      <nav aria-label="Capítulos" className="hidden lg:block">
        <ol className="sticky top-24 flex flex-col gap-1">
          {PRE_PROJECT_CHAPTERS.map((c, i) => {
            const count = answered(c.fields.map((f) => f.key));
            return (
              <li key={c.key}>
                <a href={`#chapter-${c.key}`} className={cn("relative flex items-center gap-3 rounded-md py-2 pr-2 pl-3 text-body-sm transition-colors", active === c.key ? "text-fg-strong" : "text-fg-muted hover:text-fg-strong")}>
                  {active === c.key && <motion.span layoutId="chapter-marker" className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-accent" />}
                  <span className="font-mono text-[0.6875rem] text-fg-subtle">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex-1">{c.title.replace("?", "")}</span>
                  <span className="font-numeric text-caption text-fg-subtle">
                    {count}/{c.fields.length}
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex min-w-0 flex-col gap-16">
        {PRE_PROJECT_CHAPTERS.map((chapter, i) => (
          <section key={chapter.key} id={`chapter-${chapter.key}`} className="flex scroll-mt-24 flex-col gap-7" aria-labelledby={`title-${chapter.key}`}>
            <header className="flex flex-col gap-2">
              <span className="mono-label text-accent/80">{String(i + 1).padStart(2, "0")}</span>
              <h2 id={`title-${chapter.key}`} className="text-h2">
                {chapter.title}
              </h2>
              <p className="max-w-[56ch] text-body text-fg-muted">{chapter.lead}</p>
            </header>
            <div className="grid gap-6 sm:grid-cols-2">
              {chapter.fields.map((field) => (
                <FormField key={field.key} label={field.label} required={field.key === "title"} error={errors[field.key]} className={cn(field.long || field.key === "title" ? "sm:col-span-2" : "")}>
                  {field.long ? (
                    <Textarea value={values[field.key]} onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))} placeholder={field.placeholder} minRows={2} />
                  ) : (
                    <Input
                      value={values[field.key]}
                      onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      autoFocus={field.key === "title" && !id}
                      inputSize={field.key === "title" ? "lg" : "md"}
                      className={field.key === "title" ? "font-display text-h4" : undefined}
                    />
                  )}
                </FormField>
              ))}
            </div>
          </section>
        ))}

        <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-4 border-t border-line bg-canvas/90 px-4 py-4 backdrop-blur-xl sm:mx-0 sm:px-0">
          <span className="hidden text-caption tracking-normal text-fg-subtle sm:inline">{isMac ? "⌘" : "Ctrl"} + Enter para salvar · só o nome é obrigatório</span>
          <Button type="submit" variant="primary" loading={pending} succeeded={saved} className="ml-auto min-w-40">
            {id ? "Salvar" : "Registrar pré-projeto"}
          </Button>
        </div>
      </div>
    </form>
  );
}
