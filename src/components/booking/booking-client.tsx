"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Lock, Loader2 } from "lucide-react";
import type { Slot } from "@/lib/booking";
import { formatIDR, toDateKey } from "@/lib/format";
import { toast } from "@/stores/toast";
import { HoldCountdown } from "@/components/booking/hold-countdown";
import { payWithSnap } from "@/lib/snap";

type Court = {
  id: string;
  name: string;
  pricePerHour: number;
  peak: { start: string; end: string; price: number }[];
};

type BookingResponse = {
  booking: { id: string; startTime: string; totalPrice: number; holdExpiresAt: string };
  payment: { orderId: string; snapToken: string; redirectUrl: string; isMock: boolean };
};

const nextDays = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

const dayLabel = new Intl.DateTimeFormat("id-ID", { weekday: "short" });
const dateLabel = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });

export function BookingClient({
  venue,
  courts,
  isLoggedIn,
}: {
  venue: { id: string; name: string };
  courts: Court[];
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const days = useMemo(() => nextDays(7), []);
  const [courtId, setCourtId] = useState(courts[0]?.id ?? "");
  const [date, setDate] = useState(toDateKey(days[0]));
  const [selected, setSelected] = useState<Slot | null>(null);
  const [held, setHeld] = useState<BookingResponse | null>(null);

  const court = courts.find((c) => c.id === courtId);
  const queryKey = ["availability", courtId, date];

  const { data, isFetching } = useQuery({
    queryKey,
    enabled: Boolean(courtId),
    // Slots other players hold or pay for show up on the next poll; the DB's
    // no-overlap constraint — not this — is what prevents double-booking.
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<{ slots: Slot[] }> => {
      const res = await fetch(`/api/courts/${courtId}/availability?date=${date}`);
      if (!res.ok) throw new Error("Gagal memuat slot.");
      return res.json();
    },
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["availability"] });
  }, [queryClient]);

  const hold = useMutation({
    mutationFn: async (slot: Slot): Promise<BookingResponse> => {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courtId, startTime: slot.start }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Booking gagal.");
      return json;
    },
    onSuccess: (res) => {
      setHeld(res);
      refresh();
      toast("Slot dikunci 10 menit. Selesaikan pembayaran ya.");
      payWithSnap(res.payment, {
        onSuccess: () => {
          toast("Pembayaran berhasil!");
          router.push("/profile");
        },
        onPending: () => toast("Menunggu pembayaran…"),
        onError: () => toast("Pembayaran gagal.", "error"),
        onClose: () =>
          toast("Pembayaran dibatalkan. Slot terlepas otomatis dalam 10 menit.", "error"),
      });
    },
    onError: (err: Error) => {
      toast(err.message, "error");
      setSelected(null);
      refresh();
    },
  });

  const slots = data?.slots ?? [];

  const onPick = (slot: Slot) => {
    if (slot.state !== "free") return;
    setSelected(slot);
  };

  const onPay = () => {
    if (!selected) return;
    if (!isLoggedIn) {
      router.push(`/login?next=/venues/${venue.id}`);
      return;
    }
    hold.mutate(selected);
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      {/* left: court + date + slots */}
      <div className="space-y-6 lg:col-span-2">
        <div className="reveal card p-5">
          <h2 className="mb-3 font-bold">Pilih Court</h2>
          <div className="hide-scroll flex gap-2 overflow-x-auto">
            {courts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCourtId(c.id);
                  setSelected(null);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition ${
                  c.id === courtId
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="reveal d1 card p-5">
          <h2 className="mb-3 font-bold">Pilih Tanggal</h2>
          <div className="hide-scroll flex gap-2 overflow-x-auto">
            {days.map((d) => {
              const key = toDateKey(d);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setDate(key);
                    setSelected(null);
                  }}
                  className={`w-18 shrink-0 rounded-xl px-3 py-2 text-center transition ${
                    key === date
                      ? "bg-brand-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10"
                  }`}
                >
                  <div className="text-xs opacity-80">{dateLabel.format(d)}</div>
                  <div className="font-bold">{dayLabel.format(d)}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="reveal d2 card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold">
              Slot Tersedia — {court?.name}
              {isFetching ? (
                <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-gray-400" />
              ) : null}
            </h2>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <Legend cls="slot-free" label="Kosong" />
              <Legend cls="slot-held" label="Dikunci" />
              <Legend cls="slot-taken" label="Terisi" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((s) => {
              const isSelected = selected?.start === s.start;
              const cls = isSelected ? "slot-sel" : `slot-${s.state}`;
              return (
                <button
                  key={s.start}
                  type="button"
                  disabled={s.state !== "free" || hold.isPending}
                  onClick={() => onPick(s)}
                  className={`slot ${cls}`}
                  title={s.state === "free" ? formatIDR(s.price) : undefined}
                >
                  {s.label}
                </button>
              );
            })}
            {slots.length === 0 && !isFetching ? (
              <p className="col-span-full py-6 text-center text-sm text-gray-400">
                Tidak ada slot untuk tanggal ini.
              </p>
            ) : null}
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-xs text-gray-400">
            <Info className="h-3.5 w-3.5" />
            Slot otomatis terkunci 10 menit setelah dipilih, menunggu pembayaran.
          </p>
        </div>
      </div>

      {/* right: summary */}
      <div className="lg:col-span-1">
        <div className="reveal d1 card sticky top-24 p-6 shadow-sm">
          <h3 className="mb-4 font-bold">Ringkasan Booking</h3>

          <dl className="space-y-3 text-sm">
            <Row label="Venue" value={venue.name} />
            <Row label="Court" value={court?.name ?? "—"} />
            <Row
              label="Tanggal"
              value={dateLabel.format(new Date(`${date}T00:00:00`))}
            />
            <Row
              label="Jam"
              value={selected ? `${selected.label} – ${nextHour(selected.label)}` : "—"}
            />
            <Row label="Durasi" value="60 menit" />
          </dl>

          <hr className="my-4 border-gray-100 dark:border-white/10" />

          <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
          <div className="font-display text-brand-600 dark:text-brand-400 text-2xl font-extrabold">
            {formatIDR(selected?.price ?? 0)}
          </div>

          {held ? (
            <HoldCountdown
              expiresAt={held.booking.holdExpiresAt}
              onExpire={() => {
                setHeld(null);
                setSelected(null);
                refresh();
                toast("Waktu pembayaran habis, slot dilepas.", "error");
              }}
              onPayAgain={() => payWithSnap(held.payment, {})}
            />
          ) : (
            <button
              type="button"
              onClick={onPay}
              disabled={!selected || hold.isPending}
              className="btn-primary shimmer mt-5 w-full py-3.5"
            >
              {hold.isPending
                ? "Mengunci slot…"
                : !selected
                  ? "Pilih Slot Dulu"
                  : isLoggedIn
                    ? "Lanjut Bayar →"
                    : "Masuk untuk booking"}
            </button>
          )}

          <p className="mt-3 flex items-center justify-center gap-1 text-xs text-gray-400">
            <Lock className="h-3 w-3" /> Pembayaran dienkripsi · Midtrans
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`slot ${cls} inline-block h-3 w-3 rounded p-0`} />
      {label}
    </span>
  );
}

function nextHour(hhmm: string): string {
  const h = Number(hhmm.split(":")[0]) + 1;
  return `${String(h).padStart(2, "0")}:00`;
}
