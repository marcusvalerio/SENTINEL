"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { FolderKanban, LogOut, Plus, Search, SquarePen } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { Kbd } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { CommandMenu, type CommandItem } from "@/components/ui/command-menu";
import { Dropdown } from "@/components/ui/dropdown";
import { StatusDot } from "@/components/ui/status";
import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/domain/project";
import { cn } from "@/lib/cn";
import { useIsMac } from "@/lib/use-platform";
import { logout } from "@/server/auth/actions";

type ProjectIndexItem = { id: string; name: string; codename: string | null; status: ProjectStatus };

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)));
}

export function AppHeader({ user, projects }: { user: { name: string; email: string }; projects: ProjectIndexItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [signingOut, startSignOut] = useTransition();
  const isMac = useIsMac();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() === "n" && !document.querySelector('[aria-modal="true"]')) {
        event.preventDefault();
        router.push("/projects/new");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [router]);

  const signOut = useCallback(() => startSignOut(() => logout()), []);

  const commands = useMemo<CommandItem[]>(
    () => [
      { id: "new", group: "Ações", label: "Novo projeto", icon: <Plus />, hint: <Kbd>N</Kbd>, keywords: "criar registrar", onSelect: () => router.push("/projects/new") },
      { id: "home", group: "Ações", label: "Ir para projetos", icon: <FolderKanban />, keywords: "dashboard home inicio", onSelect: () => router.push("/") },
      ...projects.map((p) => ({
        id: p.id,
        group: "Projetos",
        label: p.name,
        keywords: `${p.codename ?? ""} ${PROJECT_STATUS_LABELS[p.status]}`,
        icon: <StatusDot status={p.status} className="mx-1" />,
        hint: p.codename ? <span className="font-mono text-caption text-fg-subtle">{p.codename}</span> : undefined,
        onSelect: () => router.push(`/projects/${p.id}`),
      })),
      { id: "logout", group: "Conta", label: "Sair", icon: <LogOut />, keywords: "logout sair encerrar", onSelect: signOut },
    ],
    [projects, router, signOut],
  );

  const initials = user.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-[var(--z-header)] border-b border-line bg-canvas/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="-ml-1 flex items-center rounded-md px-1 py-1" aria-label="SENTINEL — projetos">
          <Wordmark />
        </Link>

        <nav aria-label="Principal" className="ml-6 hidden items-center gap-1 md:flex">
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className={cn(
              "rounded-sm px-2.5 py-1.5 text-body-sm transition-colors",
              pathname === "/" || pathname.startsWith("/projects") ? "text-fg-strong" : "text-fg-muted hover:text-fg-strong",
            )}
          >
            Projetos
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="group flex h-8 items-center gap-2 rounded-md bg-surface px-2.5 text-body-sm text-fg-subtle shadow-[inset_0_0_0_1px_var(--color-line-2)] transition-colors hover:text-fg-muted hover:shadow-[inset_0_0_0_1px_var(--color-line-3)] sm:w-56"
            aria-label="Abrir busca e comandos"
          >
            <Search className="size-3.5" />
            <span className="hidden flex-1 text-left sm:inline">Buscar…</span>
            <span className="hidden items-center gap-0.5 sm:flex">
              <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>

          {pathname !== "/projects/new" && (
            <Link href="/projects/new" className={buttonStyles({ variant: "primary", size: "sm", className: "hidden sm:inline-flex" })}>
              <Plus className="stroke-[2.25]" />
              Novo projeto
            </Link>
          )}

          <Dropdown
            width={240}
            trigger={({ ref, toggle, ...aria }) => (
              <button
                ref={ref}
                type="button"
                onClick={toggle}
                {...aria}
                aria-label="Conta"
                className="flex size-8 items-center justify-center rounded-full bg-identity font-display text-[11px] font-semibold tracking-wide text-accent shadow-[inset_0_0_0_1px_rgb(215_196_133/0.25)] transition-shadow hover:shadow-[inset_0_0_0_1px_rgb(215_196_133/0.55)]"
              >
                {signingOut ? <span className="size-3 animate-spin rounded-full border border-accent border-t-transparent" /> : initials}
              </button>
            )}
            items={[
              { type: "label", label: user.email },
              { label: "Novo projeto", icon: <SquarePen />, onSelect: () => router.push("/projects/new") },
              { type: "separator" },
              { label: "Sair", icon: <LogOut />, onSelect: signOut },
            ]}
          />
        </div>
      </div>
      <CommandMenu open={paletteOpen} onClose={() => setPaletteOpen(false)} items={commands} />
    </header>
  );
}
