CREATE TYPE "public"."til_type" AS ENUM('FACT', 'GOTCHA', 'SNIPPET', 'PATTERN', 'QUOTE', 'OPINION', 'LINK');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"source" text NOT NULL,
	"url" text NOT NULL,
	"mins" integer DEFAULT 5 NOT NULL,
	"tag" text NOT NULL,
	"collection_id" text NOT NULL,
	"unread" boolean DEFAULT true NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"extra" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"parent_id" integer,
	"start_time_sec" integer,
	"chapter_index" integer,
	"archived_text" text,
	"last_fetched_at" timestamp,
	"drift_status" text,
	"drift_percent" integer,
	"cluster_id" text,
	"cluster_title" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT '📁' NOT NULL,
	"color" text DEFAULT '#00F0FF' NOT NULL,
	"parent_id" text,
	"query" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extension_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"name" text DEFAULT 'Chrome Extension' NOT NULL,
	"scopes" text DEFAULT 'til:write bookmark:write bookmark:read' NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	CONSTRAINT "extension_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#00F0FF' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "til_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"short_hash" varchar(4) NOT NULL,
	"type" "til_type" DEFAULT 'FACT' NOT NULL,
	"body" text,
	"code" text,
	"code_lang" varchar(24),
	"link_url" text,
	"link_preview" jsonb,
	"link_density" varchar(8) DEFAULT 'card',
	"discharges_bookmark_id" integer,
	"superseded_by_id" text,
	"stability" real DEFAULT 1 NOT NULL,
	"ease" real DEFAULT 2.5 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"last_reviewed_at" timestamp,
	"next_review_at" timestamp,
	"logged_for" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "til_entry_tags" (
	"til_id" text NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "til_entry_tags_til_id_tag_id_pk" PRIMARY KEY("til_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extension_tokens" ADD CONSTRAINT "extension_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "til_entries" ADD CONSTRAINT "til_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "til_entries" ADD CONSTRAINT "til_entries_discharges_bookmark_id_bookmarks_id_fk" FOREIGN KEY ("discharges_bookmark_id") REFERENCES "public"."bookmarks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "til_entries" ADD CONSTRAINT "til_entries_superseded_by_id_til_entries_id_fk" FOREIGN KEY ("superseded_by_id") REFERENCES "public"."til_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "til_entry_tags" ADD CONSTRAINT "til_entry_tags_til_id_til_entries_id_fk" FOREIGN KEY ("til_id") REFERENCES "public"."til_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "til_entry_tags" ADD CONSTRAINT "til_entry_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_url_idx" ON "bookmarks" USING btree ("user_id","url");--> statement-breakpoint
CREATE INDEX "user_created_idx" ON "bookmarks" USING btree ("user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "user_unread_idx" ON "bookmarks" USING btree ("user_id","unread");--> statement-breakpoint
CREATE INDEX "bookmark_parent_idx" ON "bookmarks" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "bookmark_cluster_idx" ON "bookmarks" USING btree ("cluster_id");--> statement-breakpoint
CREATE INDEX "ext_token_user_idx" ON "extension_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ext_token_hash_idx" ON "extension_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "user_tag_idx" ON "tags" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "til_user_logged_for_idx" ON "til_entries" USING btree ("user_id","logged_for" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "til_user_short_hash_idx" ON "til_entries" USING btree ("user_id","short_hash");--> statement-breakpoint
CREATE INDEX "til_user_review_idx" ON "til_entries" USING btree ("user_id","next_review_at");--> statement-breakpoint
CREATE INDEX "til_superseded_idx" ON "til_entries" USING btree ("superseded_by_id");