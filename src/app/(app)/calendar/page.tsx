import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import { listProjectIndex } from "@/server/projects/queries";
import { CalendarView } from "@/components/calendar/calendar-view";

export const metadata: Metadata = { title: "Calendário" };

export default async function CalendarPage() {
  const user = await requireUser();
  const projects = await listProjectIndex(user.id);
  return <CalendarView projects={projects.map((project) => ({ id: project.id, name: project.name, codename: project.codename }))} />;
}
