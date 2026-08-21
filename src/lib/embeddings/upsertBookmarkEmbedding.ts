import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { embeddings } from "@/db/schema";
import { buildEmbeddingText, hashEmbeddingText } from "./embeddingInput";
import { EMBEDDING_MODEL, embedText } from "./embedText";

export type EmbeddableBookmark = {
  id: number;
  userId: string;
  title: string;
  note?: string | null;
  archivedText?: string | null;
};

export async function upsertBookmarkEmbedding(row: EmbeddableBookmark): Promise<void> {
  const text = buildEmbeddingText(row);
  if (!text.trim()) return;

  const contentHash = hashEmbeddingText(text);
  const ownerId = String(row.id);

  const [existing] = await db
    .select({ contentHash: embeddings.contentHash })
    .from(embeddings)
    .where(and(eq(embeddings.ownerType, "bookmark"), eq(embeddings.ownerId, ownerId)))
    .limit(1);

  if (existing?.contentHash === contentHash) return;

  const vector = await embedText(text);
  if (!vector) return;

  await db
    .insert(embeddings)
    .values({
      userId: row.userId,
      ownerType: "bookmark",
      ownerId,
      embedding: vector,
      model: EMBEDDING_MODEL,
      contentHash,
    })
    .onConflictDoUpdate({
      target: [embeddings.ownerType, embeddings.ownerId],
      set: {
        embedding: vector,
        model: EMBEDDING_MODEL,
        contentHash,
        userId: row.userId,
        updatedAt: new Date(),
      },
    });
}

export function scheduleBookmarkEmbedding(row: EmbeddableBookmark): void {
  void upsertBookmarkEmbedding(row).catch((e) => {
    console.error("[scheduleBookmarkEmbedding]", e);
  });
}
