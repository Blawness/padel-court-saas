import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { DEV_COOKIE, signDevSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { apiError } from "@/lib/utils";

const schema = z.object({ email: z.string().email() });

/**
 * POST /api/auth/dev-login — password-less login for local development only.
 * Refuses to run once Supabase is configured, so it can never become a production backdoor.
 */
export async function POST(req: NextRequest) {
  try {
    if (isSupabaseConfigured) {
      return NextResponse.json(
        { error: "Supabase aktif — gunakan login email/password." },
        { status: 400 },
      );
    }

    const { email } = schema.parse(await req.json());
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

    const res = NextResponse.json({ user });
    res.cookies.set(DEV_COOKIE, signDevSession(user.id), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (err) {
    return apiError(err);
  }
}
