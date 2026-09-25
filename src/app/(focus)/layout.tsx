import { requireUser } from "@/server/auth/session";

/** Focus mode: no global navigation — the task at hand is the whole screen. */
export default async function FocusLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <main id="main">{children}</main>;
}
