import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { getProject } from "./queries";

/** Resolves the project for the current user or renders 404 — never another user's data. */
export async function loadProject(params: Promise<{ id: string }>) {
  const [user, { id }] = await Promise.all([requireUser(), params]);
  const project = await getProject(user.id, id);
  if (!project) notFound();
  return { user, project };
}
