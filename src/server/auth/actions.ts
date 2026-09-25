"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { ensureAdminUser } from "./admin";
import { getDummyHash, verifyPassword } from "./password";
import { clearFailures, isRateLimited, recordFailure } from "./rate-limit";
import { createSession, destroyCurrentSession } from "./session";

export type LoginState = { error?: string; email?: string };

const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(512),
  next: z.string().optional(),
});

/** Only same-origin relative paths are accepted as post-login destinations. */
function safeNext(next: string | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  const email = String(formData.get("email") ?? "").trim();
  if (!parsed.success) {
    return { email, error: "Informe um e-mail válido e a sua senha." };
  }

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limiterKey = `${parsed.data.email}|${ip}`;
  if (isRateLimited(limiterKey)) {
    return { email, error: "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente." };
  }

  try {
    await ensureAdminUser();
    const [user] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(sql`lower(${users.email}) = ${parsed.data.email}`)
      .limit(1);

    const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? (await getDummyHash()));
    if (!user || !valid) {
      recordFailure(limiterKey);
      return { email, error: "E-mail ou senha incorretos." };
    }

    clearFailures(limiterKey);
    await createSession(user.id, requestHeaders.get("user-agent"));
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  } catch (error) {
    console.error("[auth] login failed", error instanceof Error ? error.message : "unknown error");
    return { email, error: "Não foi possível entrar agora. Tente novamente em instantes." };
  }

  redirect(safeNext(parsed.data.next) as "/");
}

export async function logout() {
  await destroyCurrentSession();
  redirect("/login?reason=signed-out");
}
