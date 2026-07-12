import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { accounts, sessions, users, verifications } from "@/db/schema";
import { appUrl } from "@/lib/env";

const googleId = process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? appUrl,
  secret: process.env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),

  // Our tables use uuid primary keys with real FKs, so let Better Auth mint uuids too.
  advanced: { database: { generateId: "uuid" } },

  user: {
    // The table itself is mapped through `schema.user` above — no modelName needed here.
    // Better Auth calls it `name`; our column (and the rest of the app) calls it `fullName`.
    fields: { name: "fullName" },
    additionalFields: {
      /**
       * `input: false` is the important part: without it, anyone could pass
       * `role: "super_admin"` in the sign-up body and grant themselves the admin panel.
       * Role is decided server-side in /api/auth/signup instead.
       */
      role: { type: "string", required: false, defaultValue: "player", input: false },
      ownerStatus: {
        type: "string",
        required: false,
        defaultValue: "approved",
        input: false,
      },
      phone: { type: "string", required: false, input: false },
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // No mail provider is wired up for verification links yet, so don't lock people out.
    requireEmailVerification: false,
  },

  socialProviders:
    googleId && googleSecret
      ? { google: { clientId: googleId, clientSecret: googleSecret } }
      : undefined,

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh the session at most once a day
  },

  // Lets server actions/route handlers persist the session cookie.
  plugins: [nextCookies()],
});
