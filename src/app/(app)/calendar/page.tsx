import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import { listCalendarCommitments } from "@/server/calendar/actions";
import { listProjectIndex } from "@/server/projects/queries";
import { CalendarView } from "@/components/calendar/calendar-view";

export const metadata: Metadata = { title: "Calendário" };

export default async function CalendarPage() {
  const user = await requireUser();
  const [projects, initialEvents] = await Promise.all([
    listProjectIndex(user.id),
    listCalendarCommitments(),
  ]);
  return <CalendarView projects={projects.map((project) => ({ id: project.id, name: project.name, codename: project.codename }))} initialEvents={initialEvents} />;
}
