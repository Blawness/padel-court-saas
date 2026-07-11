import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type Role, type User } from "@/db/schema";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const DEV_COOKIE = "pb_dev_user";

const devSecret = () => process.env.DEV_AUTH_SECRET ?? "dev-only-change-me";

/** Signed value: `<userId>.<hmac>` — prevents a user from editing the cookie to impersonate. */
export function signDevSession(userId: string): string {
  const sig = createHmac("sha256", devSecret()).update(userId).digest("hex");
  return `${userId}.${sig}`;
}

function verifyDevSession(raw: string): string | null {
  const idx = raw.lastIndexOf(".");
  if (idx < 0) return null;
  const userId = raw.slice(0, idx);
  const given = Buffer.from(raw.slice(idx + 1), "hex");
  const want = createHmac("sha256", devSecret()).update(userId).digest();
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;
  return userId;
}

/**
 * Current user, or null. Uses Supabase Auth when configured; otherwise falls back
 * to the signed dev cookie so every role is demoable without a Supabase project.
 */
export async function getCurrentUser(): Promise<User | null> {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    const { data } = (await supabase!.auth.getUser()) ?? { data: { user: null } };
    const authUser = data.user;
    if (!authUser?.email) return null;

    // Mirror the Supabase Auth record into our own User table on first sight.
    const [user] = await db
      .insert(users)
      .values({
        id: authUser.id,
        email: authUser.email,
        fullName:
          (authUser.user_metadata?.full_name as string | undefined) ??
          authUser.email.split("@")[0],
        role: (authUser.user_metadata?.role as Role | undefined) ?? "player",
      })
      .onConflictDoUpdate({ target: users.id, set: { updatedAt: new Date() } })
      .returning();

    return user;
  }

  const raw = (await cookies()).get(DEV_COOKIE)?.value;
  if (!raw) return null;
  const userId = verifyDevSession(raw);
  if (!userId) return null;

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return user ?? null;
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
  }
}

/** Throws AuthError if not logged in, or if the user's role isn't allowed. */
export async function requireUser(...roles: Role[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Silakan login terlebih dahulu.", 401);
  if (roles.length > 0 && !roles.includes(user.role)) {
    throw new AuthError("Kamu tidak punya akses ke resource ini.", 403);
  }
  return user;
}
