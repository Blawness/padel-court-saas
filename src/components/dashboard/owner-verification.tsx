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
  venueCount: number;
  planName: string | null;
  subStatus: SubscriptionStatus | null;
};

const statusChip: Record<OwnerStatus, { cls: string; label: string }> = {
  pending: { cls: "chip-amber", label: "Menunggu verifikasi" },
  approved: { cls: "chip-green", label: "Terverifikasi" },
  suspended: { cls: "chip-red", label: "Disuspend" },
};

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
    toast(ownerStatus === "approved" ? "Owner diverifikasi." : "Owner disuspend.");
    router.refresh();
  };

  return (
    <div className="reveal card overflow-hidden">
      <div className="border-b border-gray-100 p-5 dark:border-white/10">
        <h2 className="font-bold">Verifikasi Pemilik Venue</h2>
        <p className="text-xs text-gray-400">
          Signup owner bersifat self-serve; venue baru tayang ke pemain setelah diverifikasi.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Owner</th>
              <th>Venue</th>
              <th>Paket</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {owners.map((o) => (
              <tr key={o.id}>
                <td>
                  <span className="font-semibold">{o.fullName}</span>
                  <span className="block text-xs text-gray-400">{o.email}</span>
                </td>
                <td>{o.venueCount}</td>
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
                <td className="text-right">
                  <div className="flex justify-end gap-3">
                    {o.ownerStatus !== "approved" ? (
                      <button
                        type="button"
                        disabled={busy === o.id}
                        onClick={() => setStatus(o.id, "approved")}
                        className="text-brand-600 text-sm font-semibold"
                      >
                        Verifikasi
                      </button>
                    ) : null}
                    {o.ownerStatus !== "suspended" ? (
                      <button
                        type="button"
                        disabled={busy === o.id}
                        onClick={() => setStatus(o.id, "suspended")}
                        className="text-sm font-semibold text-red-500"
                      >
                        Suspend
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {owners.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-gray-400">
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
