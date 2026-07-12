import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const globalForDb = globalThis as unknown as { client?: ReturnType<typeof postgres> };

const url = process.env.DATABASE_URL!;

/**
 * Neon's pooled endpoint (`...-pooler...`) is PgBouncer in transaction mode, which cannot
 * hold a session-scoped prepared statement across queries — postgres.js uses those by
 * default, so leaving it on produces random "prepared statement does not exist" failures
 * in production. Disable prepares whenever we're talking to a pooler.
 */
const isPooled = url.includes("-pooler.");

const client =
  globalForDb.client ??
  postgres(url, {
    prepare: !isPooled,
    // Serverless functions are short-lived and many run concurrently; keep each one's pool small.
    max: process.env.NODE_ENV === "production" ? 5 : 1,
    idle_timeout: 20,
    connect_timeout: 15,
  });

if (process.env.NODE_ENV !== "production") globalForDb.client = client;

// `casing` must match drizzle.config.ts, or runtime column names drift from the migration DDL.
export const db = drizzle(client, { schema, casing: "camelCase" });
export { schema };
