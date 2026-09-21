CREATE TYPE "public"."project_role" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"resolution" integer DEFAULT 72 NOT NULL,
	"background_color" text DEFAULT '#ffffff' NOT NULL,
	"color_mode" text DEFAULT 'RGB' NOT NULL,
	"document" jsonb NOT NULL,
	"thumbnail_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_width_positive" CHECK ("projects"."width" > 0),
	CONSTRAINT "projects_height_positive" CHECK ("projects"."height" > 0)
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "project_role" DEFAULT 'editor' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"width" integer,
	"height" integer,
	"size_bytes" bigint,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"operation_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"sequence" bigserial NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"document" jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_assets" ADD CONSTRAINT "project_assets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_assets" ADD CONSTRAINT "project_assets_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_operations" ADD CONSTRAINT "project_operations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_snapshots" ADD CONSTRAINT "project_snapshots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_snapshots" ADD CONSTRAINT "project_snapshots_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_owner_id_idx" ON "projects" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "projects_updated_at_idx" ON "projects" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "project_members_project_user_idx" ON "project_members" USING btree ("project_id","user_id");--> statement-breakpoint
CREATE INDEX "project_members_project_id_idx" ON "project_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_members_user_id_idx" ON "project_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_assets_project_id_idx" ON "project_assets" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_operations_project_id_idx" ON "project_operations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_operations_seq_idx" ON "project_operations" USING btree ("project_id","sequence");--> statement-breakpoint
CREATE INDEX "project_operations_created_at_idx" ON "project_operations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "project_snapshots_project_id_idx" ON "project_snapshots" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_snapshots_created_at_idx" ON "project_snapshots" USING btree ("created_at");