/**
 * Feature flags derived from which credentials are present. Auth (Better Auth) always
 * works; the optional ones degrade: Midtrans Snap falls back to a mock checkout, Resend
 * logs to the console, and without Supabase the calendar polls instead of using Realtime.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Supabase is now only used for Realtime slot broadcasts — auth is Better Auth. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Google sign-in shows up only when its OAuth credentials are present. */
export const isGoogleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);
export const isMidtransConfigured = Boolean(
  process.env.MIDTRANS_SERVER_KEY && process.env.MIDTRANS_CLIENT_KEY,
);
export const isResendConfigured = Boolean(process.env.RESEND_API_KEY);

export const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Minutes a slot stays held as `pending_payment` before auto-release. */
export const HOLD_MINUTES = 10;
/** Hours before slot start where cancellation is still free (PRD §3, Feature 4). */
export const FREE_CANCEL_HOURS = 2;
/** Free trial length for a new venue owner (PRD §3, Feature 5). */
export const TRIAL_DAYS = 14;
