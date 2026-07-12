/**
 * Feature flags derived from which credentials are present. Auth (Better Auth) always
 * works; the optional ones degrade: Midtrans Snap falls back to a mock checkout and
 * Resend logs to the console.
 */

/** Google sign-in shows up only when its OAuth credentials are present. */
export const isGoogleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);
export const isMidtransConfigured = Boolean(
  process.env.MIDTRANS_SERVER_KEY && process.env.MIDTRANS_CLIENT_KEY,
);
export const isResendConfigured = Boolean(process.env.RESEND_API_KEY);

/** Without a Blob token the venue form falls back to pasting an image URL. */
export const isBlobConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Minutes a slot stays held as `pending_payment` before auto-release. */
export const HOLD_MINUTES = 10;
/** Hours before slot start where cancellation is still free (PRD §3, Feature 4). */
export const FREE_CANCEL_HOURS = 2;
/** Free trial length for a new venue owner (PRD §3, Feature 5). */
export const TRIAL_DAYS = 14;
