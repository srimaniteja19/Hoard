import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { embeddings } from "@/db/schema";
import { SUGGESTED_MIN_COSINE, type SimilarityPair } from "./selectSuggestedEdges";

export async function maxTilEmbeddingUpdatedAt(userId: string): Promise<string | null> {
  try {
    const [row] = await db
      .select({ max: sql<string | null>`max(${embeddings.updatedAt})::text` })
      .from(embeddings)
      .where(and(eq(embeddings.userId, userId), eq(embeddings.ownerType, "til")));
    return row?.max ?? null;
  } catch (e) {
    console.error("[maxTilEmbeddingUpdatedAt]", e);
    return null;
  }
}

export async function fetchTilSimilarityPairs(userId: string): Promise<SimilarityPair[]> {
  const maxDistance = 1 - SUGGESTED_MIN_COSINE;
  try {
    const result = await db.execute(sql`
      SELECT a.owner_id AS a, b.owner_id AS b,
        (1 - (a.embedding <=> b.embedding)) AS cosine
      FROM embeddings a
      JOIN embeddings b
        ON a.user_id = b.user_id
       AND a.owner_type = 'til' AND b.owner_type = 'til'
       AND a.owner_id < b.owner_id
      WHERE a.user_id = ${userId}
        AND (a.embedding <=> b.embedding) <= ${maxDistance}
    `);
    return (result.rows as { a: string; b: string; cosine: number | string }[]).map((r) => ({
      a: String(r.a),
      b: String(r.b),
      cosine: Number(r.cosine),
    }));
  } catch (e) {
    console.error("[fetchTilSimilarityPairs]", e);
    return [];
  }
}
