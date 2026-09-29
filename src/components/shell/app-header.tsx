"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import {
  Activity,
  FileText,
  Flag,
  FolderKanban,
  GitBranch,
  History,
  Inbox,
  Lightbulb,
  ListChecks,
  LogOut,
  Menu,
  PencilLine,
  Plus,
  Radar,
  Scale,
  Search,
  Wrench,
  X,
  ClipboardList,
  CreditCard,
} from "lucide-react";
import { GithubMark } from "@/components/brand/github-mark";
import { Wordmark } from "@/components/brand/logo";
import { Kbd } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { CommandMenu, type CommandItem, type RemoteGroup } from "@/components/ui/command-menu";
import { Dropdown } from "@/components/ui/dropdown";
import { StatusDot } from "@/components/ui/status";
import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/domain/project";
import { SEARCH_GROUP_LABELS, normalizeQuery, type SearchGroup } from "@/domain/search";
import { cn } from "@/lib/cn";
import { useIsMac } from "@/lib/use-platform";
import { logout } from "@/server/auth/actions";
import { PRIMARY_NAV } from "./nav";
import { QuickCapture } from "./quick-capture";
import { useGlobalSearch } from "./use-global-search";

const SEARCH_ICONS: Record<SearchGroup, ReactNode> = {
  projects: <FolderKanban />,
  decisions: <Scale />,
  notes: <FileText />,
  features: <ListChecks />,
  milestones: <Flag />,
  timeline: <History />,
  activity: <Activity />,
  tools: <Wrench />,
};

const NAV_ICONS: Record<string, ReactNode> = {
  "/": <Radar />,
  "/projects": <FolderKanban />,
  "/pre-projects": <ClipboardList />,
  "/inbox": <Inbox />,
  "/subscriptions": <CreditCard />,
  "/history": <History />,
};

type ProjectIndexItem = { id: string; name: string; codename: string | null; status: ProjectStatus };

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)));
}

export function AppHeader({ user, projects, inboxCount }: { user: { name: string; email: string }; projects: ProjectIndexItem[]; inboxCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { result, loading, search } = useGlobalSearch();
  const [signingOut, startSignOut] = useTransition();
  const isMac = useIsMac();

  const currentProject = useMemo(() => {
    const id = /^\/projects\/([0-9a-f-]{36})/.exec(pathname)?.[1];
    const p = id ? projects.find((x) => x.id === id) : null;
    return p ? { id: p.id, name: p.name } : null;
  }, [pathname, projects]);

  // Close the mobile menu whenever the route changes.
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      const key = event.key.toLowerCase();
      if (key === "n") {
        event.preventDefault();
        router.push("/projects/start");
      } else if (key === "i") {
        event.preventDefault();
        setCaptureOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  const signOut = useCallback(() => startSignOut(() => logout()), []);

  const commands = useMemo<CommandItem[]>(
    () => [
      { id: "idea", group: "Ações", label: "Capturar ideia", icon: <Lightbulb />, hint: <Kbd>I</Kbd>, keywords: "inbox nota rapida", onSelect: () => setCaptureOpen(true) },
      { id: "new", group: "Ações", label: "Novo projeto", icon: <Plus />, hint: <Kbd>N</Kbd>, keywords: "criar registrar", onSelect: () => router.push("/projects/start") },
      { id: "import", group: "Ações", label: "Importar do GitHub", icon: <GitBranch />, keywords: "repositorio github import", onSelect: () => router.push("/projects/import") },
      { id: "pre", group: "Ações", label: "Novo pré-projeto", icon: <ClipboardList />, keywords: "demanda cliente pedido proposta", onSelect: () => router.push("/pre-projects/new") },
      ...PRIMARY_NAV.map((n) => ({ id: `nav-${n.href}`, group: "Ir para", label: n.label, icon: NAV_ICONS[n.href], onSelect: () => router.push(n.href) })),
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

  const remote = useMemo<RemoteGroup[]>(
    () =>
      // Only show results that belong to the query currently typed — never stale ones.
      query.trim().length >= 2 && result && result.query === normalizeQuery(query)
        ? result.groups.map((g) => ({
            group: SEARCH_GROUP_LABELS[g.group],
            count: g.count,
            items: g.hits.map((hit) => ({
              id: `${g.group}-${hit.id}`,
              group: SEARCH_GROUP_LABELS[g.group],
              label: hit.title,
              description: g.group === "projects" ? hit.snippet : [hit.projectName, hit.snippet].filter(Boolean).join(" · "),
              icon: g.group === "projects" && hit.kind ? <StatusDot status={hit.kind as ProjectStatus} className="mx-1" /> : SEARCH_ICONS[g.group],
              onSelect: () => router.push(hit.href),
            })),
          }))
        : [],
    [query, result, router],
  );

  const localItems = query.trim().length >= 2 ? commands.filter((c) => c.group !== "Projetos") : commands;

  const initials = user.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const newMenu = [
    { label: "Criar manualmente", icon: <PencilLine />, onSelect: () => router.push("/projects/new") },
    { label: "Importar do GitHub", icon: <GithubMark className="size-4" />, onSelect: () => router.push("/projects/import") },
    { label: "Pré-projeto", icon: <ClipboardList />, onSelect: () => router.push("/pre-projects/new") },
    { type: "separator" as const },
    { label: "Capturar ideia", icon: <Lightbulb />, hint: <Kbd>I</Kbd>, onSelect: () => setCaptureOpen(true) },
  ];

  return (
    <header className="sticky top-0 z-[var(--z-header)] border-b border-line bg-canvas/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-2 px-4 sm:px-6 lg:px-8">
        <button type="button" onClick={() => setMenuOpen(true)} className="-ml-1.5 flex size-9 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg-strong lg:hidden" aria-label="Abrir navegação" aria-expanded={menuOpen}>
          <Menu className="size-[18px]" />
        </button>
        <Link href="/" className="-ml-1 flex items-center rounded-md px-1 py-1" aria-label="SENTINEL — Command Center">
          <Wordmark />
        </Link>

        <nav aria-label="Principal" className="ml-5 hidden items-center lg:flex">
          {PRIMARY_NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex h-8 items-center gap-1.5 rounded-md px-2.5 text-body-sm transition-colors duration-150", active ? "text-fg-strong" : "text-fg-muted hover:text-fg-strong")}
              >
                {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-md bg-surface-2/80 shadow-[inset_0_0_0_1px_var(--color-line)]" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                <span className="relative">{item.label}</span>
                {item.href === "/inbox" && inboxCount > 0 && <span className="font-numeric relative rounded-full bg-accent-soft px-1.5 text-[0.625rem] leading-4 text-accent">{inboxCount}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="group flex h-8 items-center gap-2 rounded-md px-2.5 text-body-sm text-fg-subtle shadow-[inset_0_0_0_1px_var(--color-line-2)] transition-[color,box-shadow,background-color] hover:bg-surface/60 hover:text-fg-muted hover:shadow-[inset_0_0_0_1px_var(--color-line-3)] xl:w-52"
            aria-label="Abrir busca e comandos"
          >
            <Search className="size-3.5" />
            <span className="hidden flex-1 text-left xl:inline">Buscar…</span>
            <span className="hidden items-center gap-0.5 xl:flex">
              <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>

          <Dropdown
            width={230}
            items={newMenu}
            trigger={({ ref, toggle, open, ...aria }) => (
              <button ref={ref} type="button" onClick={toggle} {...aria} className={buttonStyles({ variant: "primary", size: "sm", className: "px-2.5 sm:px-3" })}>
                <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="flex">
                  <Plus className="stroke-[2.25]" />
                </motion.span>
                <span className="hidden sm:inline">Novo</span>
              </button>
            )}
          />

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
            items={[{ type: "label", label: user.email }, { label: "Sair", icon: <LogOut />, onSelect: signOut }]}
          />
        </div>
      </div>

      {/* Mobile navigation sheet */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-[var(--z-overlay)] lg:hidden">
            <motion.div className="absolute inset-0 bg-[rgb(10_11_14/0.7)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)} aria-hidden />
            <motion.nav
              aria-label="Principal"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 42 }}
              className="absolute inset-y-0 left-0 flex w-[82%] max-w-80 flex-col gap-1 bg-canvas p-4 shadow-overlay"
            >
              <div className="mb-4 flex items-center justify-between">
                <Wordmark />
                <button type="button" onClick={() => setMenuOpen(false)} className="flex size-9 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2" aria-label="Fechar navegação">
                  <X className="size-[18px]" />
                </button>
              </div>
              {PRIMARY_NAV.map((item, i) => {
                const active = item.match(pathname);
                return (
                  <motion.div key={item.href} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 + i * 0.03 }}>
                    <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("flex h-11 items-center gap-3 rounded-md px-3 text-body [&_svg]:size-4", active ? "bg-surface-2 text-fg-strong" : "text-fg-muted")}>
                      <span className={active ? "text-accent" : "text-fg-subtle"}>{NAV_ICONS[item.href]}</span>
                      {item.label}
                      {item.href === "/inbox" && inboxCount > 0 && <span className="font-numeric ml-auto text-caption text-accent">{inboxCount}</span>}
                    </Link>
                  </motion.div>
                );
              })}
              <div className="mt-auto border-t border-line pt-4">
                <button type="button" onClick={() => { setMenuOpen(false); setCaptureOpen(true); }} className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-body text-fg-muted">
                  <Lightbulb className="size-4 text-accent" /> Capturar ideia
                </button>
              </div>
            </motion.nav>
          </div>
        )}
      </AnimatePresence>

      <QuickCapture open={captureOpen} onClose={() => setCaptureOpen(false)} project={currentProject} />
      <CommandMenu
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={localItems}
        remote={remote}
        loading={loading}
        onQueryChange={(q) => {
          setQuery(q);
          search(q);
        }}
        footer={
          <>
            <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navegar</span>
            <span className="flex items-center gap-1"><Kbd>↵</Kbd> abrir</span>
            <span className="hidden items-center gap-1 sm:flex"><Kbd>I</Kbd> ideia</span>
            {result && result.query === normalizeQuery(query) && query.trim().length >= 2 && <span className="font-numeric ml-auto">{result.total} resultados</span>}
          </>
        }
      />
    </header>
  );
}
