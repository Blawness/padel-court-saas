import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Supabase OAuth (Google) redirect target — exchanges the code for a session cookie. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") ?? "/venues";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = (await supabase?.auth.exchangeCodeForSession(code)) ?? {
      error: new Error("Supabase belum dikonfigurasi."),
    };
    if (!error) return NextResponse.redirect(new URL(next, req.nextUrl.origin));
  }

  return NextResponse.redirect(new URL("/login?error=oauth", req.nextUrl.origin));
}
