import type { BookingSource, BookingStatus, SubscriptionStatus } from "@/db/schema";

const bookingLabels: Record<BookingStatus, { text: string; cls: string }> = {
  confirmed: { text: "Lunas", cls: "chip-green" },
  pending_payment: { text: "Menunggu bayar", cls: "chip-amber" },
  cancelled: { text: "Dibatalkan", cls: "chip-gray" },
  expired: { text: "Kedaluwarsa", cls: "chip-red" },
};

export function BookingStatusChip({
  status,
  source,
}: {
  status: BookingStatus;
  source?: BookingSource;
}) {
  if (source === "blocked") return <span className="chip chip-gray">Diblokir</span>;
  if (source === "walk_in" && status === "confirmed") {
    return <span className="chip chip-blue">Walk-in</span>;
  }
  const { text, cls } = bookingLabels[status];
  return <span className={`chip ${cls}`}>{text}</span>;
}

const subLabels: Record<SubscriptionStatus, { text: string; cls: string }> = {
  trial: { text: "Trial", cls: "chip-blue" },
  active: { text: "Aktif", cls: "chip-green" },
  expired: { text: "Kedaluwarsa", cls: "chip-red" },
  cancelled: { text: "Dibatalkan", cls: "chip-gray" },
};

export function SubscriptionStatusChip({ status }: { status: SubscriptionStatus }) {
  const { text, cls } = subLabels[status];
  return <span className={`chip ${cls}`}>{text}</span>;
}
