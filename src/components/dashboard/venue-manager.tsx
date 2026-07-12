"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarOff,
  CalendarRange,
  Grid2x2,
  Lock,
  LockOpen,
  MapPin,
  Plus,
  Tag,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { formatIDR, formatIDRShort, toDateKey, WIB_OFFSET } from "@/lib/format";
import { toast } from "@/stores/toast";
import { PhotoField } from "@/components/dashboard/photo-field";

type PeakRule = { start: string; end: string; price: number };

type CourtView = {
  id: string;
  name: string;
  pricePerHour: number;
  isActive: boolean;
  peak: PeakRule[];
  occupancy: number | null;
};

type VenueView = {
  id: string;
  name: string;
  city: string;
  address: string;
  openTime: string;
  closeTime: string;
  photo: string | null;
  avgPrice: number;
  courts: CourtView[];
};

type Api = (url: string, method: string, body?: unknown) => Promise<unknown>;

export function VenueManager({
  venues,
  canWrite,
  maxVenues,
  planName,
  blobEnabled,
}: {
  venues: VenueView[];
  canWrite: boolean;
  maxVenues: number;
  planName: string;
  blobEnabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [venueModal, setVenueModal] = useState(false);
  const [courtModal, setCourtModal] = useState<VenueView | null>(null);
  const [priceModal, setPriceModal] = useState<CourtView | null>(null);
  const [blockModal, setBlockModal] = useState<{ courts: CourtView[]; courtId?: string } | null>(
    null,
  );

  const allCourts = venues.flatMap((v) => v.courts);

  const call: Api = async (url, method, body) => {
    setBusy(true);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      toast((json as { error?: string }).error ?? "Gagal menyimpan.", "error");
      return null;
    }
    router.refresh();
    return json;
  };

  const guard = () => {
    if (!canWrite) {
      toast("Langganan tidak aktif. Perpanjang untuk mengubah data.", "error");
      return false;
    }
    return true;
  };

  return (
    <>
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold">Venue & Court</h2>
          <p className="text-xs text-gray-400">
            Kelola venue, court, harga & ketersediaan · Paket {planName} ({venues.length}/{maxVenues}{" "}
            venue)
          </p>
        </div>
        <button
          type="button"
          disabled={!canWrite || busy}
          onClick={() => guard() && setVenueModal(true)}
          className="btn-primary flex items-center gap-2"
          title={canWrite ? undefined : "Langganan tidak aktif"}
        >
          {canWrite ? <Plus className="h-4 w-4" /> : <Lock className="h-4 w-4" />} Venue Baru
        </button>
      </div>

      {venues.length === 0 ? (
        <div className="card p-10 text-center text-sm text-gray-500 dark:text-gray-400">
          Belum ada venue. Tambah venue pertamamu untuk mulai menerima booking.
        </div>
      ) : (
        venues.map((venue) => (
          <section key={venue.id} className="space-y-4">
            {/* venue cover card */}
            <div className="reveal card overflow-hidden rounded-3xl">
              <div className="from-brand-500 relative h-36 bg-gradient-to-br to-teal-600">
                {venue.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={venue.photo} alt={venue.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="dots h-full w-full" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <span className="chip chip-green absolute bottom-3 left-5">
                  <span className="pdot h-1.5 w-1.5 rounded-full bg-green-500" /> Published
                </span>
                <button
                  type="button"
                  disabled={!canWrite || busy}
                  onClick={async () => {
                    if (!guard()) return;
                    if (!confirm(`Hapus venue "${venue.name}" beserta court & bookingnya?`)) return;
                    if (await call(`/api/venues/${venue.id}`, "DELETE")) toast("Venue dihapus.");
                  }}
                  className="absolute right-5 bottom-3 grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/30"
                  title="Hapus venue"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-xl font-extrabold">{venue.name}</h3>
                    <p className="mt-1 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <MapPin className="h-3.5 w-3.5" /> {venue.address} · Buka {venue.openTime}–
                      {venue.closeTime}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="chip chip-blue">QRIS</span>
                      <span className="chip chip-gray">{venue.courts.length} Court</span>
                      <span className="chip chip-amber">{venue.city}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Rata-rata harga</div>
                    <div className="text-brand-600 dark:text-brand-400 text-lg font-extrabold">
                      {venue.avgPrice ? `${formatIDRShort(venue.avgPrice)}/jam` : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* courts */}
            <div className="reveal d1">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">Daftar Court & Harga</h3>
                <button
                  type="button"
                  disabled={!canWrite || busy}
                  onClick={() => guard() && setCourtModal(venue)}
                  className="text-brand-600 flex items-center gap-1 text-sm font-semibold disabled:text-gray-300"
                >
                  <Plus className="h-4 w-4" /> Court
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {venue.courts.map((court) => (
                  <CourtCard
                    key={court.id}
                    court={court}
                    busy={busy}
                    canWrite={canWrite}
                    onPrice={() => guard() && setPriceModal(court)}
                    onBlock={() =>
                      guard() && setBlockModal({ courts: venue.courts, courtId: court.id })
                    }
                    onToggleActive={async () => {
                      if (!guard()) return;
                      const ok = await call(`/api/courts/${court.id}`, "PUT", {
                        isActive: !court.isActive,
                      });
                      if (ok) toast(court.isActive ? "Court ditutup." : "Court dibuka kembali.");
                    }}
                    onDelete={async () => {
                      if (!guard()) return;
                      if (!confirm(`Hapus ${court.name}?`)) return;
                      if (await call(`/api/courts/${court.id}`, "DELETE")) toast("Court dihapus.");
                    }}
                  />
                ))}
                {venue.courts.length === 0 ? (
                  <div className="card p-8 text-center text-sm text-gray-400 md:col-span-2">
                    Belum ada court di venue ini.
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ))
      )}

      {/* quick actions */}
      {allCourts.length > 0 ? (
        <div className="reveal d2 grid gap-4 sm:grid-cols-3">
          <QuickAction
            icon={UserPlus}
            tone="bg-blue-100 text-blue-600 dark:bg-blue-500/15"
            title="Walk-in Booking"
            body="Catat booking langsung di tempat"
            href="/owner/bookings"
          />
          <QuickAction
            icon={CalendarOff}
            tone="bg-amber-100 text-amber-600 dark:bg-amber-500/15"
            title="Blokir Slot"
            body="Maintenance / event tertutup"
            onClick={() => guard() && setBlockModal({ courts: allCourts })}
          />
          <QuickAction
            icon={CalendarRange}
            tone="bg-purple-100 text-purple-600 dark:bg-purple-500/15"
            title="Jadwal Mingguan"
            body="Lihat & filter semua booking"
            href="/owner/bookings"
          />
        </div>
      ) : null}

      {/* ---------- modals ---------- */}
      {venueModal ? (
        <Modal title="Venue Baru" onClose={() => setVenueModal(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const photo = String(f.get("photo") || "").trim();
              const ok = await call("/api/venues", "POST", {
                name: String(f.get("name")),
                city: String(f.get("city")),
                address: String(f.get("address")),
                openTime: String(f.get("openTime")),
                closeTime: String(f.get("closeTime")),
                photos: photo ? [photo] : [],
              });
              if (ok) {
                toast("Venue disimpan.");
                setVenueModal(false);
              }
            }}
            className="space-y-3"
          >
            <Field name="name" label="Nama Venue" placeholder="cth. Padel Central" required />
            <Field name="city" label="Kota" placeholder="Jakarta Pusat" required />
            <Field name="address" label="Alamat" placeholder="Jl. Sudirman No. 45" required />
            <div className="grid grid-cols-2 gap-3">
              <Field name="openTime" label="Buka" type="time" defaultValue="06:00" required />
              <Field name="closeTime" label="Tutup" type="time" defaultValue="23:00" required />
            </div>
            <PhotoField blobEnabled={blobEnabled} />
            <button type="submit" disabled={busy} className="btn-primary mt-6 w-full py-3">
              {busy ? "Menyimpan…" : "Simpan Venue"}
            </button>
          </form>
        </Modal>
      ) : null}

      {courtModal ? (
        <Modal title={`Court Baru — ${courtModal.name}`} onClose={() => setCourtModal(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const ps = String(f.get("peakStart") || "");
              const pe = String(f.get("peakEnd") || "");
              const pp = Number(f.get("peakPrice") || 0);
              const ok = await call("/api/courts", "POST", {
                venueId: courtModal.id,
                name: String(f.get("name")),
                pricePerHour: Number(f.get("pricePerHour")),
                peakPriceOverride: ps && pe && pp > 0 ? [{ start: ps, end: pe, price: pp }] : [],
              });
              if (ok) {
                toast("Court ditambahkan.");
                setCourtModal(null);
              }
            }}
            className="space-y-3"
          >
            <Field name="name" label="Nama Court" placeholder="Court 5" required />
            <Field
              name="pricePerHour"
              label="Harga dasar / jam (IDR)"
              type="number"
              placeholder="150000"
              required
            />
            <div className="grid grid-cols-3 gap-3">
              <Field name="peakStart" label="Peak mulai" type="time" defaultValue="17:00" />
              <Field name="peakEnd" label="Peak selesai" type="time" defaultValue="22:00" />
              <Field name="peakPrice" label="Harga peak" type="number" placeholder="200000" />
            </div>
            <button type="submit" disabled={busy} className="btn-primary mt-6 w-full py-3">
              {busy ? "Menyimpan…" : "Simpan Court"}
            </button>
          </form>
        </Modal>
      ) : null}

      {priceModal ? (
        <Modal title={`Harga — ${priceModal.name}`} onClose={() => setPriceModal(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const ps = String(f.get("peakStart") || "");
              const pe = String(f.get("peakEnd") || "");
              const pp = Number(f.get("peakPrice") || 0);
              const ok = await call(`/api/courts/${priceModal.id}`, "PUT", {
                pricePerHour: Number(f.get("pricePerHour")),
                peakPriceOverride: ps && pe && pp > 0 ? [{ start: ps, end: pe, price: pp }] : [],
              });
              if (ok) {
                toast("Harga diperbarui.");
                setPriceModal(null);
              }
            }}
            className="space-y-3"
          >
            <Field
              name="pricePerHour"
              label="Harga dasar / jam (IDR)"
              type="number"
              defaultValue={String(priceModal.pricePerHour)}
              required
            />
            <p className="text-xs text-gray-400">
              Kosongkan harga peak untuk memakai harga dasar sepanjang hari.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Field
                name="peakStart"
                label="Peak mulai"
                type="time"
                defaultValue={priceModal.peak[0]?.start ?? "17:00"}
              />
              <Field
                name="peakEnd"
                label="Peak selesai"
                type="time"
                defaultValue={priceModal.peak[0]?.end ?? "22:00"}
              />
              <Field
                name="peakPrice"
                label="Harga peak"
                type="number"
                defaultValue={priceModal.peak[0] ? String(priceModal.peak[0].price) : ""}
              />
            </div>
            <button type="submit" disabled={busy} className="btn-primary mt-6 w-full py-3">
              {busy ? "Menyimpan…" : "Simpan Harga"}
            </button>
          </form>
        </Modal>
      ) : null}

      {blockModal ? (
        <Modal title="Blokir Slot" onClose={() => setBlockModal(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const date = String(f.get("date"));
              const hour = String(f.get("hour"));
              const ok = await call("/api/owner/bookings", "POST", {
                courtId: String(f.get("courtId")),
                // Venue wall-clock is WIB regardless of the browser's timezone.
                startTime: new Date(`${date}T${hour}:00${WIB_OFFSET}`).toISOString(),
                kind: "blocked",
                note: String(f.get("reason")),
              });
              if (ok) {
                toast("Slot diblokir.");
                setBlockModal(null);
              }
            }}
            className="space-y-3"
          >
            <label className="block">
              <Label>Court</Label>
              <select
                name="courtId"
                defaultValue={blockModal.courtId}
                className="input"
                required
              >
                {blockModal.courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <Field
                name="date"
                label="Tanggal"
                type="date"
                defaultValue={toDateKey(new Date())}
                required
              />
              <Field name="hour" label="Jam" type="time" step={3600} defaultValue="09:00" required />
            </div>

            <label className="block">
              <Label>Alasan</Label>
              <select name="reason" className="input">
                <option value="Maintenance">Maintenance</option>
                <option value="Event tertutup">Event tertutup</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="mt-6 w-full rounded-xl bg-amber-500 py-3 font-bold text-white transition hover:bg-amber-600 disabled:opacity-50"
            >
              {busy ? "Memproses…" : "Blokir Slot"}
            </button>
          </form>
        </Modal>
      ) : null}
    </>
  );
}

function CourtCard({
  court,
  busy,
  canWrite,
  onPrice,
  onBlock,
  onToggleActive,
  onDelete,
}: {
  court: CourtView;
  busy: boolean;
  canWrite: boolean;
  onPrice: () => void;
  onBlock: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const peak = court.peak[0];

  return (
    <div className="card rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 grid h-10 w-10 place-items-center rounded-xl">
            <Grid2x2 className="h-4 w-4" />
          </span>
          <h4 className="font-bold">{court.name}</h4>
          <span className={`chip ${court.isActive ? "chip-green" : "chip-amber"}`}>
            {court.isActive ? "Aktif" : "Maintenance"}
          </span>
        </div>
        <button
          type="button"
          disabled={!canWrite || busy}
          onClick={onDelete}
          className="text-gray-400 transition hover:text-red-600 disabled:opacity-40"
          title="Hapus court"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500 dark:text-gray-400">Harga dasar</dt>
          <dd className="font-semibold">{formatIDR(court.pricePerHour)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500 dark:text-gray-400">
            Harga peak {peak ? `(${peak.start}–${peak.end})` : ""}
          </dt>
          <dd className={`font-semibold ${peak ? "text-amber-600" : "text-gray-400"}`}>
            {peak ? formatIDR(peak.price) : "—"}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500 dark:text-gray-400">Okupansi minggu ini</dt>
          <dd
            className={`font-semibold ${court.occupancy === null ? "text-gray-400" : "text-brand-600"}`}
          >
            {court.occupancy === null ? "—" : `${court.occupancy}%`}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={!canWrite || busy}
          onClick={onPrice}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gray-100 py-2 text-sm font-semibold transition hover:bg-gray-200 disabled:opacity-40 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <Tag className="h-4 w-4" /> Harga
        </button>

        {court.isActive ? (
          <>
            <button
              type="button"
              disabled={!canWrite || busy}
              onClick={onBlock}
              className="btn-ghost flex flex-1 items-center justify-center gap-1.5 py-2 text-sm disabled:opacity-40"
            >
              <Lock className="h-4 w-4" /> Blokir
            </button>
            <button
              type="button"
              disabled={!canWrite || busy}
              onClick={onToggleActive}
              className="btn-ghost px-3 py-2 text-sm disabled:opacity-40"
              title="Tutup court (maintenance)"
            >
              <CalendarOff className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={!canWrite || busy}
            onClick={onToggleActive}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-green-200 py-2 text-sm font-semibold text-green-600 transition hover:bg-green-50 disabled:opacity-40 dark:border-green-500/30 dark:hover:bg-green-500/10"
          >
            <LockOpen className="h-4 w-4" /> Buka
          </button>
        )}
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  tone,
  title,
  body,
  href,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  body: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${tone}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="font-bold">{title}</div>
      <div className="mt-1 text-xs text-gray-400">{body}</div>
    </>
  );

  const cls = "lift card hover:border-brand-300 rounded-2xl p-5 text-left block w-full";

  if (href) {
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-80">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="dark:bg-panel absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white p-6 sm:inset-0 sm:m-auto sm:h-fit sm:max-w-lg sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 dark:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1 block text-sm font-semibold">{children}</span>;
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required,
  defaultValue,
  step,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  step?: number;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input
        name={name}
        type={type}
        step={step}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        className="input"
      />
    </label>
  );
}
