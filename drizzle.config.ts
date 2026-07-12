import { defineConfig } from "drizzle-kit";

/**
 * Migrations run against the DIRECT (non-pooled) Neon endpoint when one is configured.
 * The pooler is fine for the app's queries but is the wrong place to push DDL, and in
 * production DATABASE_URL is the pooled URL. Falls back to DATABASE_URL locally, where
 * there is no pooler to worry about.
 */
const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set DIRECT_DATABASE_URL or DATABASE_URL to run migrations.");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  casing: "camelCase",
});
