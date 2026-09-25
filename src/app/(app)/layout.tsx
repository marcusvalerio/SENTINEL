import { AppHeader } from "@/components/shell/app-header";
import { requireUser } from "@/server/auth/session";
import { listProjectIndex } from "@/server/projects/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const projects = await listProjectIndex(user.id);
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader user={{ name: user.name, email: user.email }} projects={projects} />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
