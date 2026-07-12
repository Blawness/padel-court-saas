/**
 * Feature flags derived from which credentials are present.
 * The app runs fully locally with none of them: Supabase Auth falls back to a
 * signed dev cookie, Midtrans Snap falls back to a mock checkout, and Resend
 * falls back to console logging.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Password-less dev login. Without Supabase this is the only way in, so it is enabled by
 * default in development — but on a deployed, publicly reachable URL it would let anyone
 * sign in as any user, including `super_admin`. It therefore stays OFF in production unless
 * ALLOW_DEV_LOGIN is explicitly set to "true" (acceptable only for a throwaway demo).
 */
export const isDevLoginEnabled =
  !isSupabaseConfigured &&
  (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_LOGIN === "true");
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
