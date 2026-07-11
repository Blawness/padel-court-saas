"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";

/** The floating booking preview in the hero — tilts toward the cursor, like the mockup. */
export function HeroCard() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = ref.current;
    if (!card) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onMove = (e: MouseEvent) => {
      const r = card.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      card.style.transform = `perspective(900px) rotateY(${(e.clientX - cx) / 45}deg) rotateX(${-(e.clientY - cy) / 45}deg)`;
    };

    addEventListener("mousemove", onMove);
    return () => removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="reveal d2 relative">
      <div className="aurora spin-slow absolute inset-0 rounded-[2.2rem] opacity-30 blur-2xl" />

      <div ref={ref} className="relative transition-transform duration-100">
        <div className="dark:bg-panel ml-auto max-w-md rounded-[2rem] border border-gray-100 bg-white p-6 shadow-2xl dark:border-white/10">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400 flex h-9 w-9 items-center justify-center rounded-lg">
                <MapPin className="h-4 w-4" />
              </span>
              <div>
                <div className="font-bold">Padel Central</div>
                <div className="text-xs text-gray-400">Jakarta Pusat</div>
              </div>
            </div>
            <span className="chip chip-green">
              <span className="pdot h-1.5 w-1.5 rounded-full bg-green-500" /> Live
            </span>
          </div>

          {/* `dots` and `bg-gradient-*` both set background-image, so they can't share an element. */}
          <div className="from-brand-500 h-44 w-full overflow-hidden rounded-xl bg-gradient-to-br to-teal-600">
            <div className="dots h-full w-full" />
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
            <div className="slot slot-free">08:00</div>
            <div className="slot slot-sel">09:00</div>
            <div className="slot slot-taken">10:00</div>
            <div className="slot slot-free">11:00</div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400">Total</div>
              <div className="text-brand-600 dark:text-brand-400 text-xl font-extrabold">
                Rp 150.000
              </div>
            </div>
            <Link href="/venues" className="btn-primary px-5 py-2.5">
              Bayar
            </Link>
          </div>
        </div>

        <div className="fball from-brand-500 absolute -top-6 -left-6 h-14 w-14 rounded-full border-2 border-white bg-gradient-to-br from-lime-300 shadow-xl dark:border-[#0a0f0d]" />
      </div>
    </div>
  );
}
