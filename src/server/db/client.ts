import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured.");
  }
  // `prepare: false` keeps the client compatible with Neon's pooled (PgBouncer) endpoint.
  return postgres(url, { prepare: false, max: 5, idle_timeout: 20 });
}

const globalForDb = globalThis as unknown as { sentinelSql?: ReturnType<typeof postgres> };

const sql = globalForDb.sentinelSql ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.sentinelSql = sql;

export const db = drizzle(sql, { schema, casing: "snake_case" });
export type Database = typeof db;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
