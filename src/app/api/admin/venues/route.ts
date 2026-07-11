import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { venues } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/utils";

/** GET /api/admin/venues — every venue on the platform, with its owner and subscription state. */
export async function GET() {
  try {
    await requireUser("super_admin");

    const rows = await db.query.venues.findMany({
      with: {
        courts: { columns: { id: true } },
        owner: {
          columns: { id: true, fullName: true, email: true, ownerStatus: true },
          with: {
            subscriptions: {
              orderBy: (s, { desc: d }) => d(s.createdAt),
              limit: 1,
              with: { plan: true },
            },
          },
        },
      },
      orderBy: desc(venues.createdAt),
    });

    return NextResponse.json({
      venues: rows.map((v) => ({
        id: v.id,
        name: v.name,
        city: v.city,
        courtCount: v.courts.length,
        owner: {
          id: v.owner.id,
          fullName: v.owner.fullName,
          email: v.owner.email,
          ownerStatus: v.owner.ownerStatus,
        },
        subscription: v.owner.subscriptions[0] ?? null,
      })),
    });
  } catch (err) {
    return apiError(err);
  }
}
