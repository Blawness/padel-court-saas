import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/env";

/** One channel per court; the booking page subscribes to the court it's showing. */
export const courtChannel = (courtId: string) => `court:${courtId}`;

export type SlotChangeEvent = {
  courtId: string;
  startTime: string;
  state: "held" | "taken" | "free";
};

/**
 * Broadcasts a slot state change so other players' calendars update instantly.
 * No-op without Supabase — the client falls back to polling every 15s, so the
 * calendar still converges (double-booking is prevented by the DB, not by this).
 */
export async function broadcastSlotChange(event: SlotChangeEvent): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
    const channel = supabase.channel(courtChannel(event.courtId));
    await channel.subscribe();
    await channel.send({ type: "broadcast", event: "slot_change", payload: event });
    await supabase.removeChannel(channel);
  } catch (err) {
    console.error("[realtime] broadcast gagal:", err);
  }
}
