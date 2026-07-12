import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ---------------- enums (PRD §5) ---------------- */

export const roleEnum = pgEnum("Role", ["player", "venue_owner", "super_admin"]);
export const bookingStatusEnum = pgEnum("BookingStatus", [
  "pending_payment",
  "confirmed",
  "cancelled",
  "expired",
]);
export const bookingSourceEnum = pgEnum("BookingSource", ["online", "walk_in", "blocked"]);
export const paymentStatusEnum = pgEnum("PaymentStatus", [
  "pending",
  "success",
  "failed",
  "refunded",
]);
export const subscriptionStatusEnum = pgEnum("SubscriptionStatus", [
  "trial",
  "active",
  "expired",
  "cancelled",
]);
export const ownerStatusEnum = pgEnum("OwnerStatus", ["pending", "approved", "suspended"]);

const now = () => timestamp({ precision: 3, mode: "date" }).notNull().defaultNow();

/* ---------------- tables ---------------- */

export const users = pgTable(
  "User",
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull(),
    /** Better Auth's `name` field is mapped onto this column (see lib/auth.ts). */
    fullName: text().notNull(),
    role: roleEnum().notNull().default("player"),
    phone: text(),
    /** Only meaningful for venue_owner. SuperAdmin approves/suspends from the admin panel. */
    ownerStatus: ownerStatusEnum().notNull().default("pending"),
    // --- required by Better Auth ---
    emailVerified: boolean().notNull().default(false),
    image: text(),
    createdAt: now(),
    updatedAt: now().$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("User_email_key").on(t.email)],
);

/* ---------------- Better Auth tables ---------------- */

export const sessions = pgTable(
  "Session",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text().notNull(),
    expiresAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    createdAt: now(),
    updatedAt: now().$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("Session_token_key").on(t.token), index("Session_userId_idx").on(t.userId)],
);

export const accounts = pgTable(
  "Account",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text().notNull(),
    providerId: text().notNull(),
    /** Hashed password for the email/password provider; null for OAuth accounts. */
    password: text(),
    accessToken: text(),
    refreshToken: text(),
    accessTokenExpiresAt: timestamp({ precision: 3, mode: "date" }),
    refreshTokenExpiresAt: timestamp({ precision: 3, mode: "date" }),
    scope: text(),
    idToken: text(),
    createdAt: now(),
    updatedAt: now().$onUpdate(() => new Date()),
  },
  (t) => [index("Account_userId_idx").on(t.userId)],
);

export const verifications = pgTable(
  "Verification",
  {
    id: uuid().primaryKey().defaultRandom(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    createdAt: now(),
    updatedAt: now().$onUpdate(() => new Date()),
  },
  (t) => [index("Verification_identifier_idx").on(t.identifier)],
);

export const venues = pgTable(
  "Venue",
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
    city: text().notNull(),
    address: text().notNull(),
    photos: text().array().notNull().default(sql`ARRAY[]::text[]`),
    openTime: text().notNull().default("06:00"),
    closeTime: text().notNull().default("23:00"),
    createdAt: now(),
    updatedAt: now().$onUpdate(() => new Date()),
  },
  (t) => [index("Venue_city_idx").on(t.city), index("Venue_ownerId_idx").on(t.ownerId)],
);

export type PeakRule = { start: string; end: string; price: number };

export const courts = pgTable(
  "Court",
  {
    id: uuid().primaryKey().defaultRandom(),
    venueId: uuid()
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    name: text().notNull(),
    pricePerHour: integer().notNull(),
    /** [{ start: "17:00", end: "22:00", price: 250000 }] */
    peakPriceOverride: jsonb().$type<PeakRule[]>().notNull().default([]),
    isActive: boolean().notNull().default(true),
    createdAt: now(),
    updatedAt: now().$onUpdate(() => new Date()),
  },
  (t) => [index("Court_venueId_idx").on(t.venueId)],
);

export const bookings = pgTable(
  "Booking",
  {
    id: uuid().primaryKey().defaultRandom(),
    courtId: uuid()
      .notNull()
      .references(() => courts.id, { onDelete: "cascade" }),
    /** Null for owner-created blocked slots (maintenance). */
    playerId: uuid().references(() => users.id, { onDelete: "set null" }),
    startTime: timestamp({ precision: 3, mode: "date" }).notNull(),
    endTime: timestamp({ precision: 3, mode: "date" }).notNull(),
    status: bookingStatusEnum().notNull().default("pending_payment"),
    source: bookingSourceEnum().notNull().default("online"),
    totalPrice: integer().notNull(),
    /** Set on create; a pending_payment booking past this time is auto-released. */
    holdExpiresAt: timestamp({ precision: 3, mode: "date" }),
    guestName: text(),
    guestPhone: text(),
    note: text(),
    createdAt: now(),
    updatedAt: now().$onUpdate(() => new Date()),
  },
  (t) => [
    index("Booking_courtId_startTime_idx").on(t.courtId, t.startTime),
    index("Booking_playerId_idx").on(t.playerId),
    index("Booking_status_holdExpiresAt_idx").on(t.status, t.holdExpiresAt),
  ],
);

export const payments = pgTable(
  "Payment",
  {
    id: uuid().primaryKey().defaultRandom(),
    bookingId: uuid().references(() => bookings.id, { onDelete: "cascade" }),
    /** Null for booking payments; set for subscription payments. */
    subscriptionId: uuid().references(() => subscriptions.id, { onDelete: "cascade" }),
    midtransOrderId: text().notNull(),
    amount: integer().notNull(),
    status: paymentStatusEnum().notNull().default("pending"),
    paymentMethod: text(),
    snapToken: text(),
    paidAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: now(),
  },
  (t) => [
    uniqueIndex("Payment_midtransOrderId_key").on(t.midtransOrderId),
    index("Payment_bookingId_idx").on(t.bookingId),
    index("Payment_subscriptionId_idx").on(t.subscriptionId),
  ],
);

export const subscriptionPlans = pgTable(
  "SubscriptionPlan",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    maxVenues: integer().notNull(),
    monthlyPrice: integer().notNull(),
    isActive: boolean().notNull().default(true),
    createdAt: now(),
    updatedAt: now().$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("SubscriptionPlan_name_key").on(t.name)],
);

export const subscriptions = pgTable(
  "Subscription",
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: uuid()
      .notNull()
      .references(() => subscriptionPlans.id),
    status: subscriptionStatusEnum().notNull().default("trial"),
    trialEndsAt: timestamp({ precision: 3, mode: "date" }),
    currentPeriodEnd: timestamp({ precision: 3, mode: "date" }).notNull(),
    createdAt: now(),
    updatedAt: now().$onUpdate(() => new Date()),
  },
  (t) => [index("Subscription_ownerId_idx").on(t.ownerId)],
);

/* ---------------- relations (for the `with` query API) ---------------- */

export const usersRelations = relations(users, ({ many }) => ({
  venues: many(venues),
  bookings: many(bookings),
  subscriptions: many(subscriptions),
}));

export const venuesRelations = relations(venues, ({ one, many }) => ({
  owner: one(users, { fields: [venues.ownerId], references: [users.id] }),
  courts: many(courts),
}));

export const courtsRelations = relations(courts, ({ one, many }) => ({
  venue: one(venues, { fields: [courts.venueId], references: [venues.id] }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  court: one(courts, { fields: [bookings.courtId], references: [courts.id] }),
  player: one(users, { fields: [bookings.playerId], references: [users.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, { fields: [payments.bookingId], references: [bookings.id] }),
  subscription: one(subscriptions, {
    fields: [payments.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  owner: one(users, { fields: [subscriptions.ownerId], references: [users.id] }),
  plan: one(subscriptionPlans, {
    fields: [subscriptions.planId],
    references: [subscriptionPlans.id],
  }),
  payments: many(payments),
}));

/* ---------------- inferred types (replace the generated Prisma types) ---------------- */

export type User = typeof users.$inferSelect;
export type Venue = typeof venues.$inferSelect;
export type Court = typeof courts.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;

export type Role = (typeof roleEnum.enumValues)[number];
export type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];
export type BookingSource = (typeof bookingSourceEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type SubscriptionStatus = (typeof subscriptionStatusEnum.enumValues)[number];
export type OwnerStatus = (typeof ownerStatusEnum.enumValues)[number];
