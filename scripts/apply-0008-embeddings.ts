import { neon } from "@neondatabase/serverless";

// One-time application of drizzle/0008_add_embeddings.sql,
// run directly for the same reason as scripts/apply-0007-search-vector.ts
// (drizzle-kit migrate/push both blocked in this environment).
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is missing.");
  }

  const sql = neon(databaseUrl);

  const [existing] = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'embeddings'
  `;

  if (existing) {
    console.log("Already applied — embeddings table exists. No-op.");
    return;
  }

  console.log("Applying 0008: embeddings table + pgvector HNSW index...");

  await sql`CREATE EXTENSION IF NOT EXISTS vector`;

  await sql`
    CREATE TABLE "embeddings" (
      "id" text PRIMARY KEY,
      "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "owner_type" text NOT NULL,
      "owner_id" text NOT NULL,
      "embedding" vector(1536) NOT NULL,
      "model" text NOT NULL,
      "content_hash" text NOT NULL,
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`CREATE UNIQUE INDEX "embeddings_owner_idx" ON "embeddings" ("owner_type", "owner_id")`;
  await sql`CREATE INDEX "embeddings_user_type_idx" ON "embeddings" ("user_id", "owner_type")`;
  await sql`CREATE INDEX "embeddings_hnsw_idx" ON "embeddings" USING hnsw ("embedding" vector_cosine_ops)`;

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
