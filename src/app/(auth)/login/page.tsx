import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
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
    <main id="main" className="relative flex min-h-dvh flex-col overflow-hidden">
      <Aperture />
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-[380px]">
          <div className="mb-10 flex flex-col items-center gap-5 text-center">
            <LogoMark className="size-11 text-fg-strong" />
            <div className="flex flex-col gap-2">
              <h1 className="font-display text-sm font-semibold tracking-[0.34em] text-fg-strong">SENTINEL</h1>
              <p className="text-body-sm text-fg-muted">A memória operacional dos seus projetos.</p>
            </div>
          </div>
          <LoginForm next={next} notice={reason ? NOTICES[reason] : undefined} />
        </div>
      </div>
      <footer className="relative z-10 flex items-center justify-between px-6 pb-6 text-caption tracking-normal text-fg-subtle">
        <span className="eyebrow">Acesso privado</span>
        <span className="eyebrow">v0.1</span>
      </footer>
    </main>
  );
}

/** Concentric instrument rings behind the form — the SENTINEL aperture. */
function Aperture() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_65%)]" />
      <div className="absolute size-[1100px] rounded-full bg-[radial-gradient(circle,rgb(27_41_75/0.55),transparent_60%)]" />
      <svg viewBox="0 0 800 800" className="absolute size-[800px] max-w-none opacity-90">
        <circle cx="400" cy="400" r="399" stroke="rgb(212 207 214 / 0.05)" fill="none" />
        <circle cx="400" cy="400" r="300" stroke="rgb(212 207 214 / 0.06)" fill="none" strokeDasharray="2 6" />
        <circle cx="400" cy="400" r="210" stroke="rgb(212 207 214 / 0.07)" fill="none" />
        <g className="origin-center animate-[spin_80s_linear_infinite]" style={{ transformBox: "fill-box" }}>
          <circle cx="400" cy="400" r="300" fill="none" stroke="transparent" />
          <path d="M400 100 A300 300 0 0 1 612 188" stroke="rgb(181 158 95 / 0.45)" strokeWidth="1.25" fill="none" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}
