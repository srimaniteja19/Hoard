CREATE TABLE "studio_ideas" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"hook" text DEFAULT '' NOT NULL,
	"pillar" varchar(24) DEFAULT 'finance' NOT NULL,
	"format" varchar(16) DEFAULT 'reel' NOT NULL,
	"status" varchar(16) DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studio_pieces" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text DEFAULT 'Untitled piece' NOT NULL,
	"status" varchar(16) DEFAULT 'writing' NOT NULL,
	"format" varchar(16) DEFAULT 'reel' NOT NULL,
	"pillar" varchar(24) DEFAULT 'finance' NOT NULL,
	"series_id" text,
	"part" integer,
	"script" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"hashtags" text DEFAULT '' NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"cover_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studio_series" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"theme" text DEFAULT '' NOT NULL,
	"pillar" varchar(24) DEFAULT 'finance' NOT NULL,
	"parts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"next_part" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio_ideas" ADD CONSTRAINT "studio_ideas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_pieces" ADD CONSTRAINT "studio_pieces_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_pieces" ADD CONSTRAINT "studio_pieces_series_id_studio_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."studio_series"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_series" ADD CONSTRAINT "studio_series_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "studio_ideas_user_status_idx" ON "studio_ideas" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "studio_pieces_user_status_idx" ON "studio_pieces" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "studio_pieces_series_idx" ON "studio_pieces" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "studio_series_user_idx" ON "studio_series" USING btree ("user_id","created_at");