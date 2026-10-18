import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandLoop } from "@/components/brand/brand-loop";
import { LogoMark } from "@/components/brand/logo";
import { LOGIN_LOOP } from "@/lib/brand-media";
import { getCurrentUser } from "@/server/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

const NOTICES: Record<string, string> = {
  expired: "Sua sessão expirou. Entre novamente para continuar de onde parou.",
  "signed-out": "Você saiu do SENTINEL.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const [{ next, reason }, user] = await Promise.all([searchParams, getCurrentUser()]);
  if (user) redirect("/");

  return (
    <main id="main" className="relative flex min-h-dvh flex-col overflow-hidden bg-canvas">
      <BrandLoop media={LOGIN_LOOP} fallback={<LoginAtmosphere />} />
      <div className="relative z-10 flex flex-1 items-center justify-center px-5 py-8 sm:px-6 sm:py-12">
        <div className="w-full max-w-[400px]">
          <div className="mb-7 flex flex-col items-center gap-3 text-center sm:mb-9 sm:gap-4">
            <LogoMark className="size-32 sm:size-36" animated />
            <div className="flex flex-col gap-2">
              <h1 className="font-display text-sm font-semibold tracking-[0.34em] text-fg-strong">SENTINEL</h1>
              <p className="max-w-[280px] text-body-sm text-fg-muted">A memória operacional dos seus projetos.</p>
            </div>
          </div>
          <LoginForm next={next} notice={reason ? NOTICES[reason] : undefined} />
          <p className="mt-5 text-center text-caption tracking-wide text-fg-subtle">SEU ESPAÇO DE TRABALHO, EM UM SÓ LUGAR.</p>
        </div>
      </div>
      <footer className="relative z-10 flex items-center justify-between px-6 pb-5 pt-2 text-caption tracking-normal text-fg-subtle">
        <span className="eyebrow">Acesso privado</span>
        <span className="eyebrow">v0.1</span>
      </footer>
    </main>
  );
}

/** Quiet blue light gives the mark depth without competing with the form. */
function LoginAtmosphere() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute left-1/2 top-[-12rem] size-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(1_23_255/0.13),transparent_68%)] blur-2xl" />
      <div className="absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-[rgb(1_23_255/0.035)] to-transparent" />
    </div>
  );
}
