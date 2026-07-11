"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Plus, Trash2 } from "lucide-react";
import { formatIDR } from "@/lib/format";
import { toast } from "@/stores/toast";

type PeakRule = { start: string; end: string; price: number };

type CourtView = {
  id: string;
  name: string;
  pricePerHour: number;
  isActive: boolean;
  peak: PeakRule[];
};

type VenueView = {
  id: string;
  name: string;
  city: string;
  address: string;
  openTime: string;
  closeTime: string;
  courts: CourtView[];
};

export function VenueManager({
  venues,
  canWrite,
  maxVenues,
  planName,
}: {
  venues: VenueView[];
  canWrite: boolean;
  maxVenues: number;
  planName: string;
}) {
  const router = useRouter();
  const [creatingVenue, setCreatingVenue] = useState(false);
  const [busy, setBusy] = useState(false);

  const call = async (url: string, method: string, body?: unknown) => {
    setBusy(true);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      toast(json.error ?? "Gagal menyimpan.", "error");
      return null;
    }
    router.refresh();
    return json;
  };

  const createVenue = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const ok = await call("/api/venues", "POST", {
      name: String(f.get("name")),
      city: String(f.get("city")),
      address: String(f.get("address")),
      openTime: String(f.get("openTime")),
      closeTime: String(f.get("closeTime")),
      photos: [],
    });
    if (ok) {
      toast("Venue dibuat.");
      setCreatingVenue(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold">Venue & Court</h2>
          <p className="text-xs text-gray-400">
            Paket {planName} — {venues.length}/{maxVenues} venue terpakai
          </p>
        </div>

        <button
          type="button"
          disabled={!canWrite || busy}
          onClick={() => setCreatingVenue((v) => !v)}
          className="btn-primary flex items-center gap-1.5"
          title={canWrite ? undefined : "Langganan tidak aktif"}
        >
          {canWrite ? <Plus className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          Tambah Venue
        </button>
      </div>

      {creatingVenue && canWrite ? (
        <form onSubmit={createVenue} className="reveal card grid gap-3 p-5 sm:grid-cols-2">
          <Field name="name" label="Nama venue" required />
          <Field name="city" label="Kota" required />
          <div className="sm:col-span-2">
            <Field name="address" label="Alamat" required />
          </div>
          <Field name="openTime" label="Jam buka" type="time" defaultValue="06:00" required />
          <Field name="closeTime" label="Jam tutup" type="time" defaultValue="23:00" required />
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={busy} className="btn-primary">
              Simpan venue
            </button>
            <button type="button" onClick={() => setCreatingVenue(false)} className="btn-ghost">
              Batal
            </button>
          </div>
        </form>
      ) : null}

      {venues.length === 0 ? (
        <div className="card p-10 text-center text-sm text-gray-500 dark:text-gray-400">
          Belum ada venue. Tambah venue pertamamu untuk mulai menerima booking.
        </div>
      ) : (
        venues.map((venue) => (
          <VenueCard
            key={venue.id}
            venue={venue}
            canWrite={canWrite}
            busy={busy}
            call={call}
          />
        ))
      )}
    </>
  );
}

function VenueCard({
  venue,
  canWrite,
  busy,
  call,
}: {
  venue: VenueView;
  canWrite: boolean;
  busy: boolean;
  call: (url: string, method: string, body?: unknown) => Promise<unknown>;
}) {
  const [addingCourt, setAddingCourt] = useState(false);

  const addCourt = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const peakStart = String(f.get("peakStart") || "");
    const peakEnd = String(f.get("peakEnd") || "");
    const peakPrice = Number(f.get("peakPrice") || 0);

    const ok = await call("/api/courts", "POST", {
      venueId: venue.id,
      name: String(f.get("name")),
      pricePerHour: Number(f.get("pricePerHour")),
      peakPriceOverride:
        peakStart && peakEnd && peakPrice > 0
          ? [{ start: peakStart, end: peakEnd, price: peakPrice }]
          : [],
    });
    if (ok) {
      toast("Court ditambahkan.");
      setAddingCourt(false);
    }
  };

  const deleteVenue = async () => {
    if (!confirm(`Hapus venue "${venue.name}" beserta semua court dan bookingnya?`)) return;
    const ok = await call(`/api/venues/${venue.id}`, "DELETE");
    if (ok) toast("Venue dihapus.");
  };

  return (
    <div className="reveal card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5 dark:border-white/10">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold">{venue.name}</h3>
          <p className="truncate text-xs text-gray-400">
            {venue.city} · {venue.address} · buka {venue.openTime}–{venue.closeTime}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!canWrite || busy}
            onClick={() => setAddingCourt((v) => !v)}
            className="btn-ghost flex items-center gap-1.5 py-2 text-sm"
          >
            <Plus className="h-4 w-4" /> Court
          </button>
          <button
            type="button"
            disabled={!canWrite || busy}
            onClick={deleteVenue}
            className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-40 dark:border-red-500/30 dark:hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {addingCourt && canWrite ? (
        <form onSubmit={addCourt} className="grid gap-3 border-b border-gray-100 p-5 sm:grid-cols-5 dark:border-white/10">
          <Field name="name" label="Nama court" placeholder="Court 1" required />
          <Field
            name="pricePerHour"
            label="Harga/jam (IDR)"
            type="number"
            placeholder="150000"
            required
          />
          <Field name="peakStart" label="Peak mulai" type="time" />
          <Field name="peakEnd" label="Peak selesai" type="time" />
          <Field name="peakPrice" label="Harga peak" type="number" placeholder="200000" />
          <div className="flex gap-2 sm:col-span-5">
            <button type="submit" disabled={busy} className="btn-primary">
              Simpan court
            </button>
            <button type="button" onClick={() => setAddingCourt(false)} className="btn-ghost">
              Batal
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Court</th>
              <th>Harga normal</th>
              <th>Peak / off-peak</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {venue.courts.map((court) => (
              <CourtRow key={court.id} court={court} canWrite={canWrite} busy={busy} call={call} />
            ))}
            {venue.courts.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  Belum ada court di venue ini.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CourtRow({
  court,
  canWrite,
  busy,
  call,
}: {
  court: CourtView;
  canWrite: boolean;
  busy: boolean;
  call: (url: string, method: string, body?: unknown) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(court.pricePerHour);

  const save = async () => {
    const ok = await call(`/api/courts/${court.id}`, "PUT", { pricePerHour: price });
    if (ok) {
      toast("Harga diperbarui.");
      setEditing(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Hapus ${court.name}?`)) return;
    const ok = await call(`/api/courts/${court.id}`, "DELETE");
    if (ok) toast("Court dihapus.");
  };

  return (
    <tr>
      <td className="font-semibold">{court.name}</td>
      <td>
        {editing ? (
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="input w-32 py-1"
          />
        ) : (
          formatIDR(court.pricePerHour)
        )}
      </td>
      <td>
        {court.peak.length === 0 ? (
          <span className="text-gray-400">—</span>
        ) : (
          court.peak.map((p) => (
            <span key={`${p.start}-${p.end}`} className="chip chip-amber mr-1">
              {p.start}–{p.end} · {formatIDR(p.price)}
            </span>
          ))
        )}
      </td>
      <td>
        <span className={`chip ${court.isActive ? "chip-green" : "chip-gray"}`}>
          {court.isActive ? "Aktif" : "Nonaktif"}
        </span>
      </td>
      <td className="text-right">
        {editing ? (
          <div className="flex justify-end gap-2">
            <button type="button" onClick={save} disabled={busy} className="text-brand-600 text-sm font-semibold">
              Simpan
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-sm text-gray-400">
              Batal
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={!canWrite || busy}
              onClick={() => setEditing(true)}
              className="text-brand-600 text-sm font-semibold disabled:text-gray-300"
            >
              Ubah harga
            </button>
            <button
              type="button"
              disabled={!canWrite || busy}
              onClick={remove}
              className="text-sm font-semibold text-red-500 disabled:text-gray-300"
            >
              Hapus
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        className="input"
      />
    </label>
  );
}
