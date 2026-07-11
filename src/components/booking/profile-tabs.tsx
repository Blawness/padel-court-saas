"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MessageCircle } from "lucide-react";
import type { BookingStatus } from "@/db/schema";
import { BookingStatusChip } from "@/components/status-chip";
import { formatIDR, formatSlot } from "@/lib/format";
import { FREE_CANCEL_HOURS } from "@/lib/env";
import { toast } from "@/stores/toast";

export type BookingView = {
  id: string;
  venueName: string;
  courtName: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  totalPrice: number;
};

export function ProfileTabs({
  upcoming,
  past,
}: {
  upcoming: BookingView[];
  past: BookingView[];
}) {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <>
      <div className="mt-8 flex gap-2 border-b border-gray-200 dark:border-white/10">
        <TabButton active={tab === "upcoming"} onClick={() => setTab("upcoming")}>
          Akan Datang
        </TabButton>
        <TabButton active={tab === "past"} onClick={() => setTab("past")}>
          Riwayat
        </TabButton>
      </div>

      <div className="mt-6 space-y-4">
        {list.length === 0 ? (
          <div className="card p-10 text-center text-sm text-gray-500 dark:text-gray-400">
            {tab === "upcoming" ? "Belum ada booking yang akan datang." : "Belum ada riwayat."}
          </div>
        ) : (
          list.map((b) => <BookingCard key={b.id} booking={b} cancellable={tab === "upcoming"} />)
        )}
      </div>
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-4 py-3 font-semibold transition ${
        active
          ? "border-brand-600 text-brand-600"
          : "border-transparent text-gray-400 hover:text-gray-600"
      }`}
    >
      {children}
    </button>
  );
}

function BookingCard({ booking, cancellable }: { booking: BookingView; cancellable: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const canCancel =
    cancellable && booking.status !== "cancelled" && booking.status !== "expired";

  const cancel = async () => {
    // Read the clock at click time, not during render — and the API enforces this anyway.
    const hoursLeft = (new Date(booking.startTime).getTime() - Date.now()) / 3_600_000;
    if (hoursLeft < FREE_CANCEL_HOURS) {
      toast(
        `Pembatalan gratis hanya sampai ${FREE_CANCEL_HOURS} jam sebelum main. Hubungi venue via WhatsApp.`,
        "error",
      );
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/bookings/${booking.id}`, { method: "DELETE" });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) {
      toast(json.error ?? "Gagal membatalkan.", "error");
      return;
    }
    toast("Booking dibatalkan.");
    router.refresh();
  };

  return (
    <div className="reveal lift card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <div className="bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 grid h-14 w-14 shrink-0 place-items-center rounded-xl">
        <CalendarDays className="h-6 w-6" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold">
            {booking.venueName} · {booking.courtName}
          </h3>
          <BookingStatusChip status={booking.status} />
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {formatSlot(booking.startTime, booking.endTime)} ·{" "}
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            {formatIDR(booking.totalPrice)}
          </span>
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        {/* PRD §10 decision: WhatsApp confirmation is a manual wa.me deep link in v1. */}
        <a
          href={`https://wa.me/?text=${encodeURIComponent(
            `Halo, saya punya booking di ${booking.venueName} ${booking.courtName} pada ${formatSlot(booking.startTime, booking.endTime)}.`,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost flex items-center gap-1.5 py-2 text-sm"
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>

        {canCancel ? (
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
          >
            {busy ? "…" : "Batal"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
