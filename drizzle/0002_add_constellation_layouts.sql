-- Migration: Add constellation_layouts table for Constellation layout caching (SPECTACLE.md §3)

CREATE TABLE "constellation_layouts" (
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "cache_key" text NOT NULL,
  "positions" jsonb NOT NULL,
  "computed_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "constellation_layouts_user_idx" ON "constellation_layouts" ("user_id");
