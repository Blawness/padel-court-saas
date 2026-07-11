-- Zero double-booking, enforced by the database itself.
-- Two bookings on the same court may never have overlapping time ranges while
-- they are live (held for payment or confirmed). Cancelled/expired rows are
-- excluded from the constraint so a released slot becomes bookable again.
--
-- Drizzle cannot express an EXCLUDE constraint in its schema DSL, so this is a
-- custom migration. Postgres raises SQLSTATE 23P01 on violation, which
-- createBooking() maps to a friendly 409.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "Booking"
  ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist (
    "courtId" WITH =,
    tsrange("startTime", "endTime", '[)') WITH &&
  )
  WHERE ("status" IN ('pending_payment', 'confirmed'));
