"use client";

import { usePathname } from "next/navigation";
import { TabNav } from "@/components/ui/tabs";
import { PROJECT_SECTIONS, type SectionSlug } from "./sections";

export function ProjectSectionNav({ projectId, counts }: { projectId: string; counts: Partial<Record<SectionSlug, number>> }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const current = pathname.slice(base.length).replace(/^\//, "").split("/")[0] ?? "";
  return (
    <TabNav
      id="project-sections"
      label="Seções do projeto"
      items={PROJECT_SECTIONS.map((s) => ({
        href: s.slug ? `${base}/${s.slug}` : base,
        label: s.label,
        active: current === s.slug,
        count: counts[s.slug],
      }))}
    />
  );
}
