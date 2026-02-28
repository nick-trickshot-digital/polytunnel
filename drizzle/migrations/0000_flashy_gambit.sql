CREATE TABLE "beds" (
	"id" text PRIMARY KEY NOT NULL,
	"column" text NOT NULL,
	"position" integer NOT NULL,
	"width_mm" integer NOT NULL,
	"length_mm" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crop_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"bed_id" text NOT NULL,
	"plant_name" text NOT NULL,
	"plant_family" text,
	"year" integer NOT NULL,
	"season" text,
	"success_rating" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "harvests" (
	"id" serial PRIMARY KEY NOT NULL,
	"planting_id" integer NOT NULL,
	"date_harvested" date NOT NULL,
	"quantity" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"bed_id" text NOT NULL,
	"planting_id" integer,
	"image_url" text NOT NULL,
	"caption" text,
	"taken_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plantings" (
	"id" serial PRIMARY KEY NOT NULL,
	"bed_id" text NOT NULL,
	"plant_name" text NOT NULL,
	"variety" text,
	"date_planted" date,
	"date_sown" date,
	"expected_harvest_start" date,
	"expected_harvest_end" date,
	"planned_sow_date" date,
	"planned_transplant_date" date,
	"bed_fraction" text DEFAULT 'full' NOT NULL,
	"status" text DEFAULT 'growing' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"planting_id" integer,
	"title" text NOT NULL,
	"description" text,
	"due_date" date,
	"category" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"is_ai_generated" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crop_history" ADD CONSTRAINT "crop_history_bed_id_beds_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."beds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvests" ADD CONSTRAINT "harvests_planting_id_plantings_id_fk" FOREIGN KEY ("planting_id") REFERENCES "public"."plantings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_bed_id_beds_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."beds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_planting_id_plantings_id_fk" FOREIGN KEY ("planting_id") REFERENCES "public"."plantings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_bed_id_beds_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."beds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_planting_id_plantings_id_fk" FOREIGN KEY ("planting_id") REFERENCES "public"."plantings"("id") ON DELETE no action ON UPDATE no action;