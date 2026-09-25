import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { sessions, users } from "@/server/db/schema";
import { SESSION_COOKIE, SESSION_RENEW_THRESHOLD_MS, SESSION_TTL_MS } from "./constants";

export type SessionUser = { id: string; email: string; name: string; role: "admin" | "member" };

function digest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

/** Must be called from a Server Action or Route Handler (cookies are writable there). */
export async function createSession(userId: string, userAgent: string | null) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({
    id: digest(token),
    userId,
    expiresAt,
    userAgent: userAgent?.slice(0, 256) ?? null,
  });
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

async function validateToken(token: string): Promise<SessionUser | null> {
  const id = digest(token);
  const [row] = await db
    .select({
      expiresAt: sessions.expiresAt,
      user: { id: users.id, email: users.email, name: users.name, role: users.role },
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .limit(1);

  if (!row) return null;

  const remaining = row.expiresAt.getTime() - Date.now();
  if (remaining <= 0) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  if (remaining < SESSION_RENEW_THRESHOLD_MS) {
    // Sliding expiration. The proxy refreshes the cookie lifetime on navigation.
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
      .where(eq(sessions.id, id));
  }
  return row.user;
}

/** The authenticated user for this request, deduplicated per render. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateToken(token);
});

/**
 * Server-side authorization gate. Every protected page, action and query goes
 * through this — the proxy's cookie check is only an optimistic redirect.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (user) return user;
  const hasCookie = (await cookies()).has(SESSION_COOKIE);
  redirect(hasCookie ? "/login?reason=expired" : "/login");
}

export async function destroyCurrentSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, digest(token)));
  // __Host- cookies are only replaced when the attributes match (Secure, Path=/).
  jar.set(SESSION_COOKIE, "", { ...cookieOptions(new Date(0)), maxAge: 0 });
}
