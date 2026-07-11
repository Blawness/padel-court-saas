"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

type Tier = {
  name: string;
  monthly: number | null; // null = "Custom"
  yearly: number | null;
  features: string[];
  featured?: boolean;
  cta: string;
  href: string;
};

/**
 * Plan prices here are marketing copy for the public page. The plans an owner can
 * actually subscribe to come from the SubscriptionPlan table (SuperAdmin-managed)
 * and are rendered on /owner/subscription.
 */
const tiers: Tier[] = [
  {
    name: "Basic",
    monthly: 99_000,
    yearly: 95_000,
    features: ["1 venue", "4 court", "Booking real-time", "Laporan dasar"],
    cta: "Mulai Trial",
    href: "/signup?role=venue_owner",
  },
  {
    name: "Pro",
    monthly: 349_000,
    yearly: 279_000,
    features: [
      "Hingga 5 venue",
      "Unlimited court",
      "Harga peak/off-peak",
      "Analitik lengkap + export",
      "Priority support",
    ],
    featured: true,
    cta: "Mulai Trial",
    href: "/signup?role=venue_owner",
  },
  {
    name: "Enterprise",
    monthly: null,
    yearly: null,
    features: ["Unlimited venue", "White-label", "API akses", "Dedicated CS"],
    cta: "Hubungi Kami",
    href: "https://wa.me/6281234567890",
  },
];

export function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="reveal mx-auto mb-12 max-w-2xl text-center">
          <h2 className="font-display text-4xl font-extrabold lg:text-5xl">Harga Transparan</h2>
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
            Mulai trial 14 hari. Berhenti kapan saja.
          </p>

          <div className="mt-6 inline-flex items-center gap-3 rounded-full bg-gray-100 p-1.5 text-sm font-semibold dark:bg-white/5">
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={`rounded-full px-4 py-1.5 transition ${
                yearly ? "text-gray-500 dark:text-gray-400" : "bg-white shadow dark:bg-white/10"
              }`}
            >
              Bulanan
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className={`rounded-full px-4 py-1.5 transition ${
                yearly ? "bg-white shadow dark:bg-white/10" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              Tahunan −20%
            </button>
          </div>
        </div>

        <div className="grid items-start gap-8 md:grid-cols-3">
          {tiers.map((tier, i) => {
            const price = yearly ? tier.yearly : tier.monthly;

            if (tier.featured) {
              return (
                <div
                  key={tier.name}
                  className="reveal d1 lift bg-brand-600 shadow-brand-500/40 relative scale-105 rounded-3xl p-8 text-white shadow-2xl"
                >
                  <span className="text-brand-700 absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 text-xs font-bold shadow">
                    PALING POPULER
                  </span>
                  <h3 className="text-lg font-bold">{tier.name}</h3>
                  <div className="font-display mt-3 text-4xl font-extrabold">
                    Rp {price!.toLocaleString("id-ID")}
                    <span className="text-base font-normal text-white/70">/bln</span>
                  </div>
                  <ul className="mt-6 space-y-3 text-sm text-white/90">
                    {tier.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check className="h-4 w-4 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={tier.href}
                    className="text-brand-700 mt-7 block w-full rounded-xl bg-white py-3 text-center font-semibold transition hover:bg-gray-100"
                  >
                    {tier.cta}
                  </Link>
                </div>
              );
            }

            return (
              <div key={tier.name} className={`reveal d${i} lift card p-8`}>
                <h3 className="text-lg font-bold">{tier.name}</h3>
                <div className="font-display mt-3 text-4xl font-extrabold">
                  {price === null ? (
                    "Custom"
                  ) : (
                    <>
                      Rp {price.toLocaleString("id-ID")}
                      <span className="text-base font-normal text-gray-400">/bln</span>
                    </>
                  )}
                </div>
                <ul className="mt-6 space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  {tier.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="text-brand-600 h-4 w-4 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.href}
                  className="border-brand-200 hover:bg-brand-50 mt-7 block w-full rounded-xl border-2 py-3 text-center font-semibold transition dark:border-white/10 dark:hover:bg-white/5"
                >
                  {tier.cta}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
