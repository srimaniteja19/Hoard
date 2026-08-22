CREATE TABLE IF NOT EXISTS "bookmark_uses" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "bookmark_id" integer NOT NULL REFERENCES "bookmarks"("id") ON DELETE CASCADE,
  "used_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "bookmark_uses_user_used_idx"
  ON "bookmark_uses" ("user_id", "used_at");

CREATE INDEX IF NOT EXISTS "bookmark_uses_bookmark_used_idx"
  ON "bookmark_uses" ("bookmark_id", "used_at");
