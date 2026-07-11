import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { DEV_COOKIE, signDevSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/utils";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  /** Owner signup is self-serve (PRD §10 decision); the account starts `pending` approval. */
  role: z.enum(["player", "venue_owner"]).default("player"),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    const existing = await db.query.users.findFirst({ where: eq(users.email, body.email) });
    if (existing) {
      return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });
    }

    // Players are visible immediately; owners need SuperAdmin approval before their venues go live.
    const ownerStatus = body.role === "venue_owner" ? ("pending" as const) : ("approved" as const);

    if (isSupabaseConfigured) {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase!.auth.signUp({
        email: body.email,
        password: body.password,
        options: { data: { full_name: body.fullName, role: body.role } },
      });
      if (error || !data.user) {
        return NextResponse.json({ error: error?.message ?? "Signup gagal." }, { status: 400 });
      }

      const [user] = await db
        .insert(users)
        .values({
          id: data.user.id,
          email: body.email,
          fullName: body.fullName,
          phone: body.phone,
          role: body.role,
          ownerStatus,
        })
        .returning();

      return NextResponse.json({ user }, { status: 201 });
    }

    // Dev fallback: no password store — the signed dev cookie stands in for a session.
    const [user] = await db
      .insert(users)
      .values({
        email: body.email,
        fullName: body.fullName,
        phone: body.phone,
        role: body.role,
        ownerStatus,
      })
      .returning();

    const res = NextResponse.json({ user }, { status: 201 });
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
