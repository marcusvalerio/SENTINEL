import "dotenv/config";
import postgres from "postgres";
import { hashPassword } from "../src/server/auth/password";

/**
 * Creates the initial administrator from environment variables.
 * The password is read from SENTINEL_ADMIN_PASSWORD and never printed.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  const email = process.env.SENTINEL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SENTINEL_ADMIN_PASSWORD;
  if (!url) throw new Error("DATABASE_URL is not configured.");
  if (!email || !password) throw new Error("SENTINEL_ADMIN_EMAIL and SENTINEL_ADMIN_PASSWORD are required.");
  if (password.length < 12) throw new Error("SENTINEL_ADMIN_PASSWORD must have at least 12 characters.");

  const sql = postgres(url, { max: 1, prepare: false });
  const name = email.split("@")[0]!.replace(/^\w/, (c) => c.toUpperCase());
  const rows = await sql`
    insert into users (email, name, password_hash, role)
    values (${email}, ${name}, ${await hashPassword(password)}, 'admin')
    on conflict do nothing
    returning id`;
  await sql.end();
  console.log(rows.length ? `Administrator ${email} created.` : `Administrator ${email} already exists — unchanged.`);
}

main().catch((error) => {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
