CREATE TABLE "scrap_assets" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "scrap_id" text REFERENCES "scraps"("id") ON DELETE SET NULL,
  "filename" varchar(255) NOT NULL,
  "mime_type" varchar(100) NOT NULL,
  "data" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "width" integer,
  "height" integer,
  "created_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "scrap_assets_user_created_idx" ON "scrap_assets" ("user_id", "created_at" DESC);--> statement-breakpoint
CREATE INDEX "scrap_assets_scrap_id_idx" ON "scrap_assets" ("scrap_id");
