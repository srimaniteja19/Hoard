-- Shared embedding store for hybrid library search (and later TIL constellation).
-- owner_type + owner_id is polymorphic so bookmarks and TILs share one pipeline.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "embeddings" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "owner_type" text NOT NULL,
  "owner_id" text NOT NULL,
  "embedding" vector(1536) NOT NULL,
  "model" text NOT NULL,
  "content_hash" text NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "embeddings_owner_idx" ON "embeddings" ("owner_type", "owner_id");
CREATE INDEX "embeddings_user_type_idx" ON "embeddings" ("user_id", "owner_type");
CREATE INDEX "embeddings_hnsw_idx" ON "embeddings" USING hnsw ("embedding" vector_cosine_ops);

-- Rollback (run by hand if this needs to be undone):
-- DROP INDEX "embeddings_hnsw_idx";
-- DROP INDEX "embeddings_user_type_idx";
-- DROP INDEX "embeddings_owner_idx";
-- DROP TABLE "embeddings";
