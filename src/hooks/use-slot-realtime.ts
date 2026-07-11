"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { courtChannel } from "@/lib/realtime";

/**
 * Subscribes to a court's realtime channel and calls `onChange` whenever another
 * player holds, pays for, or releases a slot. Without Supabase this is inert and the
 * calendar relies on TanStack Query's polling instead.
 */
export function useSlotRealtime(courtId: string | undefined, onChange: () => void) {
  useEffect(() => {
    if (!courtId) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(courtChannel(courtId))
      .on("broadcast", { event: "slot_change" }, onChange)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [courtId, onChange]);
}
