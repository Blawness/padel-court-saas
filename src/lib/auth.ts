import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type Role, type User } from "@/db/schema";
import { auth } from "@/lib/auth-config";

/**
 * Current user, or null. Backed by Better Auth sessions (email/password + optional Google).
 * The password-less "dev login" that used to stand in for auth is gone — there is no longer
 * a way to sign in as another user without their password.
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return null;

  // Re-read our own row so callers get the full typed record (role, ownerStatus, phone…).
  const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
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
