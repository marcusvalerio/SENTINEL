import { AppHeader } from "@/components/shell/app-header";
import { requireUser } from "@/server/auth/session";
import { countInbox } from "@/server/ideas/queries";
import { listProjectIndex } from "@/server/projects/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [projects, inboxCount] = await Promise.all([listProjectIndex(user.id), countInbox(user.id)]);
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader user={{ name: user.name, email: user.email }} projects={projects} inboxCount={inboxCount} />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
