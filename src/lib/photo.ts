/**
 * Venue photo limits. Lives apart from `lib/env` because the upload widget is a client
 * component, and `lib/env` reads server-only secrets that have no business being pulled
 * into the browser bundle.
 *
 * These bounds are what the upload token is signed for, so Blob enforces them server-side
 * too — the client checks are only there to fail fast.
 */
export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_MAX_MB = Math.round(PHOTO_MAX_BYTES / 1024 / 1024);
