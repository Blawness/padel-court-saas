"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { faqItems as items } from "@/lib/faq";

export function Faq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-gray-50/60 py-24 transition-colors dark:bg-white/5">
      <div className="mx-auto max-w-3xl px-6">
        <div className="reveal mb-12 text-center">
          <h2 className="font-display text-4xl font-extrabold lg:text-5xl">Pertanyaan Umum</h2>
        </div>

        <div className="space-y-4">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="reveal card overflow-hidden rounded-2xl">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between p-5 text-left font-semibold"
                >
                  <span>{item.q}</span>
                  <Plus
                    className={`text-brand-600 h-5 w-5 shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  />
                </button>
                <div
                  className="grid transition-all duration-400 ease-out"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm text-gray-600 dark:text-gray-400">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
