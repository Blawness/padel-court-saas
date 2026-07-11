"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatIDRShort } from "@/lib/format";

type Granularity = "daily" | "weekly" | "monthly";

type RevenueResponse = {
  totalRevenue: number;
  series: { key: string; label: string; revenue: number; bookings: number }[];
  utilisation: { courtId: string; name: string; percent: number }[];
};

const ranges: Record<Granularity, { days: number; label: string }> = {
  daily: { days: 7, label: "Harian" },
  weekly: { days: 56, label: "Mingguan" },
  monthly: { days: 180, label: "Bulanan" },
};

export function RevenueChart() {
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const { days } = ranges[granularity];

  const { data, isLoading } = useQuery({
    queryKey: ["revenue", granularity],
    queryFn: async (): Promise<RevenueResponse> => {
      const res = await fetch(`/api/owner/revenue?granularity=${granularity}&days=${days}`);
      if (!res.ok) throw new Error("Gagal memuat pendapatan.");
      return res.json();
    },
  });

  const series = data?.series ?? [];
  const max = Math.max(...series.map((s) => s.revenue), 1);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="reveal card rounded-2xl p-5 lg:col-span-2">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">Grafik Pendapatan</h2>
            <p className="text-xs text-gray-400">
              Total {formatIDRShort(data?.totalRevenue ?? 0)} pada periode ini
            </p>
          </div>
          <div className="flex gap-1 text-xs">
            {(Object.keys(ranges) as Granularity[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGranularity(g)}
                className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                  g === granularity
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10"
                }`}
              >
                {ranges[g].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex h-56 items-end gap-2">
          {isLoading ? (
            <p className="w-full text-center text-sm text-gray-400">Memuat…</p>
          ) : series.length === 0 ? (
            <p className="w-full text-center text-sm text-gray-400">Belum ada pendapatan.</p>
          ) : (
            series.map((s) => (
              <div key={s.key} className="flex h-full flex-1 flex-col items-center gap-2">
                {/* The track needs a definite height, or the bar's `height: %` resolves to 0. */}
                <div className="relative w-full flex-1">
                  <div
                    className="bar bg-brand-500 dark:bg-brand-500/80 absolute bottom-0 w-full"
                    style={{ height: `${Math.max((s.revenue / max) * 100, 2)}%` }}
                    title={formatIDRShort(s.revenue)}
                  />
                </div>
                <span className="truncate text-[10px] text-gray-400">{s.label}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="reveal d1 card rounded-2xl p-5">
        <h2 className="mb-4 font-bold">Utilisasi Court</h2>
        <div className="space-y-4">
          {(data?.utilisation ?? []).map((c) => (
            <div key={c.courtId}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{c.name}</span>
                <span className="text-brand-600 font-semibold">{c.percent}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-white/10">
                <div
                  className="bg-brand-500 h-full rounded-full transition-all"
                  style={{ width: `${c.percent}%` }}
                />
              </div>
            </div>
          ))}
          {(data?.utilisation ?? []).length === 0 && !isLoading ? (
            <p className="text-sm text-gray-400">Belum ada court.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
