"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OwnerStatus, SubscriptionStatus } from "@/db/schema";
import { toast } from "@/stores/toast";

type OwnerRow = {
  id: string;
  fullName: string;
  email: string;
  ownerStatus: OwnerStatus;
  venueName: string | null;
  venueCount: number;
  city: string | null;
  createdAt: string;
  planName: string | null;
  subStatus: SubscriptionStatus | null;
};

const statusChip: Record<OwnerStatus, { cls: string; label: string }> = {
  pending: { cls: "chip-amber", label: "Menunggu verifikasi" },
  approved: { cls: "chip-green", label: "Terverifikasi" },
  suspended: { cls: "chip-red", label: "Disuspend" },
};

/** "2 jam lalu" / "3 hari lalu" — matches the mockup's Join column. */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 60) return `${Math.max(minutes, 1)} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return `${Math.round(days / 30)} bulan lalu`;
}

export function OwnerVerification({ owners }: { owners: OwnerRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const setStatus = async (ownerId: string, ownerStatus: OwnerStatus) => {
    setBusy(ownerId);
    const res = await fetch("/api/admin/owners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId, ownerStatus }),
    });
    setBusy(null);

    if (!res.ok) {
      toast("Gagal memperbarui owner.", "error");
      return;
    }
    toast(
      ownerStatus === "approved"
        ? "Owner disetujui — venue-nya kini tayang ke pemain."
        : "Owner disuspend — venue-nya disembunyikan.",
    );
    router.refresh();
  };

  return (
    <div className="reveal card overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-white/10">
        <div>
          <h2 className="font-bold">Verifikasi Owner Baru</h2>
          <p className="text-xs text-gray-400">
            Signup owner self-serve; venue baru tayang ke pemain setelah disetujui.
          </p>
        </div>
        <span className="chip chip-amber">
          {owners.filter((o) => o.ownerStatus === "pending").length} menunggu
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Owner</th>
              <th>Venue</th>
              <th>Kota</th>
              <th>Paket</th>
              <th>Status</th>
              <th>Join</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {owners.map((o) => (
              <tr key={o.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="from-brand-500 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br to-teal-500 text-xs font-bold text-white">
                      {o.fullName.charAt(0).toUpperCase()}
                    </span>
                    <span>
                      <span className="block font-semibold">{o.fullName}</span>
                      <span className="block text-xs text-gray-400">{o.email}</span>
                    </span>
                  </div>
                </td>
                <td>
                  {o.venueName ?? <span className="text-gray-400">—</span>}
                  {o.venueCount > 1 ? (
                    <span className="block text-xs text-gray-400">+{o.venueCount - 1} lainnya</span>
                  ) : null}
                </td>
                <td>{o.city ?? <span className="text-gray-400">—</span>}</td>
                <td>
                  {o.planName ? (
                    <>
                      {o.planName}
                      <span className="block text-xs text-gray-400">{o.subStatus}</span>
                    </>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td>
                  <span className={`chip ${statusChip[o.ownerStatus].cls}`}>
                    {statusChip[o.ownerStatus].label}
                  </span>
                </td>
                <td className="text-gray-400">{relativeTime(o.createdAt)}</td>
                <td>
                  <div className="flex gap-3">
                    {o.ownerStatus !== "approved" ? (
                      <button
                        type="button"
                        disabled={busy === o.id}
                        onClick={() => setStatus(o.id, "approved")}
                        className="text-sm font-semibold text-green-600 disabled:opacity-40"
                      >
                        Setujui
                      </button>
                    ) : null}
                    {o.ownerStatus !== "suspended" ? (
                      <button
                        type="button"
                        disabled={busy === o.id}
                        onClick={() => setStatus(o.id, "suspended")}
                        className="text-sm font-semibold text-red-600 disabled:opacity-40"
                      >
                        {o.ownerStatus === "pending" ? "Tolak" : "Suspend"}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {owners.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-gray-400">
                  Belum ada pemilik venue.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
