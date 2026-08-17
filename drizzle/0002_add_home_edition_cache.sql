CREATE TABLE "home_edition_cache" (
	"user_id" text PRIMARY KEY NOT NULL,
	"cache_key" text NOT NULL,
	"cached_date" date NOT NULL,
	"payload" jsonb NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "home_edition_cache" ADD CONSTRAINT "home_edition_cache_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;