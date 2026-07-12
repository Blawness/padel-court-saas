import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth-config";
import { apiError } from "@/lib/utils";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password minimal 8 karakter."),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  /** Only these two are selectable. `super_admin` is never reachable through signup. */
  role: z.enum(["player", "venue_owner"]).default("player"),
});

/**
 * POST /api/auth/signup — wraps Better Auth's email sign-up so that role/ownerStatus are
 * decided here rather than taken from the request body (they're `input: false` in the auth
 * config). Owner signup is self-serve but lands in `pending` until a SuperAdmin approves.
 */
export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    const existing = await db.query.users.findFirst({ where: eq(users.email, body.email) });
    if (existing) {
      return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });
    }

    const result = await auth.api.signUpEmail({
      body: { email: body.email, password: body.password, name: body.fullName },
      headers: req.headers,
      asResponse: true,
    });

    if (!result.ok) {
      const detail = await result.json().catch(() => ({}));
      return NextResponse.json(
        { error: (detail as { message?: string }).message ?? "Pendaftaran gagal." },
        { status: result.status },
      );
    }

    // Players are live immediately; owners stay hidden from players until approved.
    const [user] = await db
      .update(users)
      .set({
        role: body.role,
        phone: body.phone,
        ownerStatus: body.role === "venue_owner" ? "pending" : "approved",
      })
      .where(eq(users.email, body.email))
      .returning();

    // Forward Better Auth's Set-Cookie so the new user lands already signed in.
    const res = NextResponse.json({ user }, { status: 201 });
    for (const cookie of result.headers.getSetCookie()) {
      res.headers.append("set-cookie", cookie);
    }
    return res;
  } catch (err) {
    return apiError(err);
  }
}
