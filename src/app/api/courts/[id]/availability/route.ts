import { NextResponse, type NextRequest } from "next/server";
import { buildSlots } from "@/lib/booking";
import { apiError } from "@/lib/utils";
import { toDateKey } from "@/lib/format";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/courts/{id}/availability?date=YYYY-MM-DD — public.
 * Returns the 60-minute slot grid with each slot's state and price.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const date = req.nextUrl.searchParams.get("date") ?? toDateKey(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Format tanggal harus YYYY-MM-DD." }, { status: 400 });
    }

    const slots = await buildSlots(id, date);
    return NextResponse.json({ date, slots });
  } catch (err) {
    return apiError(err);
  }
}
