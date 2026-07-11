"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Lock, UserPlus } from "lucide-react";
import type { BookingSource, BookingStatus } from "@/db/schema";
import { BookingStatusChip } from "@/components/status-chip";
import { formatIDR, formatSlot, toDateKey, WIB_OFFSET } from "@/lib/format";
import { toast } from "@/stores/toast";

type VenueOption = { id: string; name: string; courts: { id: string; name: string }[] };

type OwnerBooking = {
  id: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  source: BookingSource;
  totalPrice: number;
  guestName: string | null;
  note: string | null;
  player: { fullName: string; phone: string | null } | null;
  court: { name: string; venue: { name: string } };
};

const statuses: { value: string; label: string }[] = [
  { value: "all", label: "Semua status" },
  { value: "confirmed", label: "Lunas" },
  { value: "pending_payment", label: "Menunggu bayar" },
  { value: "cancelled", label: "Dibatalkan" },
  { value: "expired", label: "Kedaluwarsa" },
];

export function BookingsManager({
  venues,
  canWrite,
}: {
  venues: VenueOption[];
  canWrite: boolean;
}) {
  const queryClient = useQueryClient();
  const [venueId, setVenueId] = useState("all");
  const [courtId, setCourtId] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showManual, setShowManual] = useState(false);

  const courts =
    venueId === "all"
      ? venues.flatMap((v) => v.courts)
      : (venues.find((v) => v.id === venueId)?.courts ?? []);

  const params = new URLSearchParams();
  if (venueId !== "all") params.set("venueId", venueId);
  if (courtId !== "all") params.set("courtId", courtId);
  if (status !== "all") params.set("status", status);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const { data, isLoading } = useQuery({
    queryKey: ["owner-bookings", params.toString()],
    queryFn: async (): Promise<{ bookings: OwnerBooking[] }> => {
      const res = await fetch(`/api/owner/bookings?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat booking.");
      return res.json();
    },
  });

  const manual = useMutation({
    mutationFn: async (payload: {
      courtId: string;
      startTime: string;
      kind: "walk_in" | "blocked";
      guestName?: string;
      note?: string;
    }) => {
      const res = await fetch("/api/owner/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan.");
      return json;
    },
    onSuccess: (_data, vars) => {
      toast(vars.kind === "blocked" ? "Slot diblokir." : "Walk-in dicatat.");
      setShowManual(false);
      void queryClient.invalidateQueries({ queryKey: ["owner-bookings"] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal membatalkan.");
      return json;
    },
    onSuccess: () => {
      toast("Booking dibatalkan.");
      void queryClient.invalidateQueries({ queryKey: ["owner-bookings"] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const submitManual = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const date = String(f.get("date"));
    const hour = String(f.get("hour"));
    manual.mutate({
      courtId: String(f.get("courtId")),
      // Venue wall-clock is WIB regardless of the browser's timezone.
      startTime: new Date(`${date}T${hour}:00${WIB_OFFSET}`).toISOString(),
      kind: String(f.get("kind")) as "walk_in" | "blocked",
      guestName: String(f.get("guestName") || "") || undefined,
      note: String(f.get("note") || "") || undefined,
    });
  };

  const bookings = data?.bookings ?? [];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-extrabold">Booking</h2>
        <button
          type="button"
          disabled={!canWrite || courts.length === 0}
          onClick={() => setShowManual((v) => !v)}
          className="btn-primary flex items-center gap-1.5"
          title={canWrite ? undefined : "Langganan tidak aktif"}
        >
          {canWrite ? <UserPlus className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          Blokir slot / Walk-in
        </button>
      </div>

      {showManual && canWrite ? (
        <form onSubmit={submitManual} className="reveal card grid gap-3 p-5 sm:grid-cols-3">
          <label className="block">
            <Label>Court</Label>
            <select name="courtId" className="input" required>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <Label>Tanggal</Label>
            <input
              name="date"
              type="date"
              defaultValue={toDateKey(new Date())}
              className="input"
              required
            />
          </label>

          <label className="block">
            <Label>Jam mulai</Label>
            <input name="hour" type="time" step={3600} defaultValue="19:00" className="input" required />
          </label>

          <label className="block">
            <Label>Jenis</Label>
            <select name="kind" className="input">
              <option value="walk_in">Walk-in (dihitung sebagai omzet)</option>
              <option value="blocked">Blokir / maintenance (tanpa omzet)</option>
            </select>
          </label>

          <label className="block">
            <Label>Nama tamu (walk-in)</Label>
            <input name="guestName" className="input" placeholder="Nama pemain" />
          </label>

          <label className="block">
            <Label>Catatan</Label>
            <input name="note" className="input" placeholder="mis. perbaikan lampu" />
          </label>

          <div className="flex gap-2 sm:col-span-3">
            <button type="submit" disabled={manual.isPending} className="btn-primary">
              {manual.isPending ? "Menyimpan…" : "Simpan"}
            </button>
            <button type="button" onClick={() => setShowManual(false)} className="btn-ghost">
              Batal
            </button>
          </div>
        </form>
      ) : null}

      {/* filters */}
      <div className="reveal card grid gap-3 p-5 sm:grid-cols-5">
        <label className="block">
          <Label>Venue</Label>
          <select
            value={venueId}
            onChange={(e) => {
              setVenueId(e.target.value);
              setCourtId("all");
            }}
            className="input"
          >
            <option value="all">Semua venue</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <Label>Court</Label>
          <select value={courtId} onChange={(e) => setCourtId(e.target.value)} className="input">
            <option value="all">Semua court</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <Label>Status</Label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <Label>Dari</Label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
        </label>

        <label className="block">
          <Label>Sampai</Label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
        </label>
      </div>

      <div className="reveal card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Pemain</th>
                <th>Venue / Court</th>
                <th>Waktu</th>
                <th>Total</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>
                    <span className="font-semibold">
                      {b.player?.fullName ?? b.guestName ?? "—"}
                    </span>
                    {b.note ? (
                      <span className="block text-xs text-gray-400">{b.note}</span>
                    ) : null}
                  </td>
                  <td>
                    {b.court.venue.name}
                    <span className="block text-xs text-gray-400">{b.court.name}</span>
                  </td>
                  <td>{formatSlot(b.startTime, b.endTime)}</td>
                  <td className="font-semibold">{formatIDR(b.totalPrice)}</td>
                  <td>
                    <BookingStatusChip status={b.status} source={b.source} />
                  </td>
                  <td className="text-right">
                    {b.status === "confirmed" || b.status === "pending_payment" ? (
                      <button
                        type="button"
                        disabled={cancel.isPending}
                        onClick={() => {
                          if (confirm("Batalkan booking ini?")) cancel.mutate(b.id);
                        }}
                        className="flex items-center gap-1 text-sm font-semibold text-red-500"
                      >
                        <Ban className="h-3.5 w-3.5" /> Batalkan
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-400">
                    {isLoading ? "Memuat…" : "Tidak ada booking untuk filter ini."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
      {children}
    </span>
  );
}
