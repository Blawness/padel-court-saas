"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

/** Shows the remaining hold window and fires `onExpire` when it runs out. */
export function HoldCountdown({
  expiresAt,
  onExpire,
  onPayAgain,
}: {
  expiresAt: string;
  onExpire: () => void;
  onPayAgain: () => void;
}) {
  const [left, setLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)),
  );

  useEffect(() => {
    const tick = setInterval(() => {
      const next = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setLeft(next);
      if (next === 0) {
        clearInterval(tick);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [expiresAt, onExpire]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="mt-5 space-y-3">
      <div className="chip chip-amber w-full justify-center py-2 text-sm">
        <Timer className="h-4 w-4" /> Slot dikunci — sisa {mm}:{ss}
      </div>
      <button type="button" onClick={onPayAgain} className="btn-primary shimmer w-full py-3.5">
        Buka pembayaran
      </button>
    </div>
  );
}
