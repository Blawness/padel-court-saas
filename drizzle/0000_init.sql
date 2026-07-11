CREATE TYPE "public"."BookingSource" AS ENUM('online', 'walk_in', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."BookingStatus" AS ENUM('pending_payment', 'confirmed', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."OwnerStatus" AS ENUM('pending', 'approved', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."PaymentStatus" AS ENUM('pending', 'success', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."Role" AS ENUM('player', 'venue_owner', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."SubscriptionStatus" AS ENUM('trial', 'active', 'expired', 'cancelled');--> statement-breakpoint
CREATE TABLE "Booking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"courtId" uuid NOT NULL,
	"playerId" uuid,
	"startTime" timestamp (3) NOT NULL,
	"endTime" timestamp (3) NOT NULL,
	"status" "BookingStatus" DEFAULT 'pending_payment' NOT NULL,
	"source" "BookingSource" DEFAULT 'online' NOT NULL,
	"totalPrice" integer NOT NULL,
	"holdExpiresAt" timestamp (3),
	"guestName" text,
	"guestPhone" text,
	"note" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Court" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venueId" uuid NOT NULL,
	"name" text NOT NULL,
	"pricePerHour" integer NOT NULL,
	"peakPriceOverride" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bookingId" uuid,
	"subscriptionId" uuid,
	"midtransOrderId" text NOT NULL,
	"amount" integer NOT NULL,
	"status" "PaymentStatus" DEFAULT 'pending' NOT NULL,
	"paymentMethod" text,
	"snapToken" text,
	"paidAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SubscriptionPlan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"maxVenues" integer NOT NULL,
	"monthlyPrice" integer NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ownerId" uuid NOT NULL,
	"planId" uuid NOT NULL,
	"status" "SubscriptionStatus" DEFAULT 'trial' NOT NULL,
	"trialEndsAt" timestamp (3),
	"currentPeriodEnd" timestamp (3) NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"fullName" text NOT NULL,
	"role" "Role" DEFAULT 'player' NOT NULL,
	"phone" text,
	"ownerStatus" "OwnerStatus" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Venue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ownerId" uuid NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"address" text NOT NULL,
	"photos" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"openTime" text DEFAULT '06:00' NOT NULL,
	"closeTime" text DEFAULT '23:00' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_courtId_Court_id_fk" FOREIGN KEY ("courtId") REFERENCES "public"."Court"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_playerId_User_id_fk" FOREIGN KEY ("playerId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Court" ADD CONSTRAINT "Court_venueId_Venue_id_fk" FOREIGN KEY ("venueId") REFERENCES "public"."Venue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_Booking_id_fk" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_Subscription_id_fk" FOREIGN KEY ("subscriptionId") REFERENCES "public"."Subscription"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_ownerId_User_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_SubscriptionPlan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."SubscriptionPlan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_ownerId_User_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "Booking_courtId_startTime_idx" ON "Booking" USING btree ("courtId","startTime");--> statement-breakpoint
CREATE INDEX "Booking_playerId_idx" ON "Booking" USING btree ("playerId");--> statement-breakpoint
CREATE INDEX "Booking_status_holdExpiresAt_idx" ON "Booking" USING btree ("status","holdExpiresAt");--> statement-breakpoint
CREATE INDEX "Court_venueId_idx" ON "Court" USING btree ("venueId");--> statement-breakpoint
CREATE UNIQUE INDEX "Payment_midtransOrderId_key" ON "Payment" USING btree ("midtransOrderId");--> statement-breakpoint
CREATE INDEX "Payment_bookingId_idx" ON "Payment" USING btree ("bookingId");--> statement-breakpoint
CREATE INDEX "Payment_subscriptionId_idx" ON "Payment" USING btree ("subscriptionId");--> statement-breakpoint
CREATE UNIQUE INDEX "SubscriptionPlan_name_key" ON "SubscriptionPlan" USING btree ("name");--> statement-breakpoint
CREATE INDEX "Subscription_ownerId_idx" ON "Subscription" USING btree ("ownerId");--> statement-breakpoint
CREATE UNIQUE INDEX "User_email_key" ON "User" USING btree ("email");--> statement-breakpoint
CREATE INDEX "Venue_city_idx" ON "Venue" USING btree ("city");--> statement-breakpoint
CREATE INDEX "Venue_ownerId_idx" ON "Venue" USING btree ("ownerId");