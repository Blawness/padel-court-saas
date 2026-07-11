export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Compact IDR for KPI tiles: 1.250.000 -> "Rp 1,25 jt". */
export function formatIDRShort(amount: number): string {
  if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  if (amount >= 1_000) return `Rp ${Math.round(amount / 1_000)} rb`;
  return `Rp ${amount}`;
}

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Asia/Jakarta",
});
const timeFmt = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export function formatDate(d: Date | string): string {
  return dateFmt.format(new Date(d));
}

export function formatTime(d: Date | string): string {
  return timeFmt.format(new Date(d));
}

export function formatSlot(start: Date | string, end: Date | string): string {
  return `${formatDate(start)}, ${formatTime(start)}–${formatTime(end)}`;
}

/**
 * The product is Indonesia-only, so venue wall-clock time is always WIB. Slot times are
 * built against this offset explicitly rather than the server's local zone — otherwise the
 * same code yields different slots on a WIB laptop and a UTC Vercel function.
 */
export const WIB_OFFSET = "+07:00";

const jakartaParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hour12: false,
});

/** `2026-07-12` — the calendar date in Jakarta, whatever zone the server runs in. */
export function toDateKey(d: Date): string {
  const [date] = jakartaParts.format(d).split(", ");
  return date;
}

/** The hour-of-day (0–23) in Jakarta. */
export function jakartaHour(d: Date): number {
  const [, hour] = jakartaParts.format(d).split(", ");
  return Number(hour) % 24;
}

/** Exact instant of `hour`:00 WIB on the given `YYYY-MM-DD`. */
export function wibSlotStart(dateKey: string, hour: number): Date {
  return new Date(`${dateKey}T${String(hour).padStart(2, "0")}:00:00${WIB_OFFSET}`);
}
