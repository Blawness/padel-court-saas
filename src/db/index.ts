import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const globalForDb = globalThis as unknown as { client?: ReturnType<typeof postgres> };

// Reuse the connection across hot reloads; serverless functions get a small pool.
const client =
  globalForDb.client ??
  postgres(process.env.DATABASE_URL!, {
    max: process.env.NODE_ENV === "production" ? 5 : 1,
  });

if (process.env.NODE_ENV !== "production") globalForDb.client = client;

// `casing` must match drizzle.config.ts, or runtime column names drift from the migration DDL.
export const db = drizzle(client, { schema, casing: "camelCase" });
export { schema };
