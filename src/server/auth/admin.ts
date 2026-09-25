import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { hashPassword } from "./password";

/**
 * Creates the initial administrator from SENTINEL_ADMIN_EMAIL /
 * SENTINEL_ADMIN_PASSWORD when that account does not exist yet.
 *
 * Idempotent and create-only: an existing account (and its password) is never
 * touched, so rotating the env var after the first login has no effect.
 */
export async function ensureAdminUser(): Promise<void> {
  const email = process.env.SENTINEL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SENTINEL_ADMIN_PASSWORD;
  if (!email || !password) return;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);
  if (existing.length > 0) return;

  await db
    .insert(users)
    .values({
      email,
      name: email.split("@")[0]!.replace(/^\w/, (c) => c.toUpperCase()),
      passwordHash: await hashPassword(password),
      role: "admin",
    })
    .onConflictDoNothing();
}
