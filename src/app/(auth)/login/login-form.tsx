"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, AtSign, Eye, EyeOff, Info, LockKeyhole } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { login, type LoginState } from "@/server/auth/actions";

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [reveal, setReveal] = useState(false);

  return (
    <motion.form
      action={action}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-5 rounded-xl bg-surface/80 p-6 shadow-[inset_0_0_0_1px_var(--color-line-2),0_24px_64px_-24px_rgb(0_0_0/0.7)] backdrop-blur-md sm:p-7"
      noValidate
    >
      {next && <input type="hidden" name="next" value={next} />}

      <AnimatePresence initial={false} mode="popLayout">
        {state.error ? (
          <motion.p
            key="error"
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0, x: [0, -5, 5, -3, 3, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.36 }}
            className="rounded-md bg-danger-soft px-3 py-2.5 text-body-sm text-danger shadow-[inset_0_0_0_1px_rgb(224_146_143/0.2)]"
          >
            {state.error}
          </motion.p>
        ) : notice ? (
          <motion.p
            key="notice"
            role="status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-2 rounded-md bg-identity/70 px-3 py-2.5 text-body-sm text-fg shadow-[inset_0_0_0_1px_rgb(147_166_216/0.16)]"
          >
            <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
            {notice}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <FormField label="E-mail">
        <Input
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          autoFocus
          defaultValue={state.email}
          placeholder="voce@exemplo.com"
          leading={<AtSign />}
          inputSize="lg"
        />
      </FormField>

      <FormField label="Senha">
        <Input
          name="password"
          type={reveal ? "text" : "password"}
          autoComplete="current-password"
          required
          placeholder="••••••••••••"
          leading={<LockKeyhole />}
          inputSize="lg"
          trailing={
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              aria-label={reveal ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={reveal}
              className="-mr-1.5 flex size-8 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:bg-surface-3 hover:text-fg"
            >
              {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          }
        />
      </FormField>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={pending}
        className="mt-1 w-full"
        trailing={!pending && <ArrowRight className="transition-transform duration-200 group-hover/button:translate-x-0.5" />}
      >
        {pending ? "Verificando…" : "Entrar"}
      </Button>
    </motion.form>
  );
}
