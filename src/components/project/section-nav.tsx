"use client";

import { ChevronDown } from "lucide-react";
import type { Route } from "next";
import { motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { Dropdown } from "@/components/ui/dropdown";
import { TabNav } from "@/components/ui/tabs";
import { cn } from "@/lib/cn";
import { PROJECT_SECTIONS, type SectionSlug } from "./sections";

export function ProjectSectionNav({
  projectId,
  counts,
}: {
  projectId: string;
  counts: Partial<Record<SectionSlug, number>>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/projects/${projectId}`;
  const current =
    pathname.slice(base.length).replace(/^\//, "").split("/")[0] ?? "";
  const href = (slug: string) => (slug ? `${base}/${slug}` : base);
  const document = PROJECT_SECTIONS.filter((s) => s.group === "document");
  const activeDoc = document.find((s) => s.slug === current);

  return (
    <div className="flex items-center gap-1">
      <TabNav
        id="project-sections"
        label="Seções do projeto"
        className="min-w-0 flex-1"
        items={PROJECT_SECTIONS.filter((s) => s.group === "primary").map(
          (s) => ({
            href: href(s.slug),
            label: s.label,
            active: current === s.slug,
            count: counts[s.slug],
          }),
        )}
      />
      <div className="shrink-0 border-l border-line pl-1">
        <Dropdown
          align="end"
          width={220}
          trigger={({ ref, toggle, open, ...aria }) => (
            <button
              ref={ref}
              type="button"
              onClick={toggle}
              {...aria}
              className={cn(
                "group relative flex h-11 shrink-0 items-center gap-1.5 px-2.5 text-body-sm transition-colors",
                activeDoc || open
                  ? "text-fg-strong"
                  : "text-fg-muted hover:text-fg-strong",
              )}
            >
              <span
                className="absolute inset-x-0 inset-y-1.5 rounded-sm transition-colors group-hover:bg-surface-2/70"
                aria-hidden
              />
              <span className="relative">
                {activeDoc ? `Projeto · ${activeDoc.label}` : "Projeto"}
              </span>
              <ChevronDown
                className={cn(
                  "relative size-3.5 text-fg-subtle transition-transform duration-200",
                  open && "rotate-180",
                )}
                aria-hidden
              />
              {activeDoc && (
                <motion.span
                  layoutId="project-sections-underline"
                  className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 520, damping: 42 }}
                />
              )}
            </button>
          )}
          items={[
            { type: "label" as const, label: "Documento do projeto" },
            ...document.map((s) => ({
              label: s.label,
              selected: s.slug === current,
              hint: counts[s.slug] ? (
                <span className="font-numeric">{counts[s.slug]}</span>
              ) : undefined,
              onSelect: () =>
                router.push(href(s.slug) as Route, { scroll: false }),
            })),
          ]}
        />
      </div>
    </div>
  );
}
