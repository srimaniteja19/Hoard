import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { embeddings } from "@/db/schema";
import { buildEmbeddingText, buildTilEmbeddingText, hashEmbeddingText } from "./embeddingInput";
import { EMBEDDING_MODEL, embedText } from "./embedText";

export type EmbeddableBookmark = {
  id: number;
  userId: string;
  title: string;
  note?: string | null;
  archivedText?: string | null;
};

export type EmbeddableTil = {
  id: string;
  userId: string;
  body?: string | null;
  code?: string | null;
  linkUrl?: string | null;
};

async function upsertOwnedEmbedding(
  userId: string,
  ownerType: "bookmark" | "til",
  ownerId: string,
  text: string
): Promise<void> {
  if (!text.trim()) return;

  const contentHash = hashEmbeddingText(text);

  const [existing] = await db
    .select({ contentHash: embeddings.contentHash })
    .from(embeddings)
    .where(and(eq(embeddings.ownerType, ownerType), eq(embeddings.ownerId, ownerId)))
    .limit(1);

  if (existing?.contentHash === contentHash) return;

  const vector = await embedText(text);
  if (!vector) return;

  await db
    .insert(embeddings)
    .values({
      userId,
      ownerType,
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
        userId,
        updatedAt: new Date(),
      },
    });
}

export async function upsertBookmarkEmbedding(row: EmbeddableBookmark): Promise<void> {
  await upsertOwnedEmbedding(row.userId, "bookmark", String(row.id), buildEmbeddingText(row));
}

export async function upsertTilEmbedding(row: EmbeddableTil): Promise<void> {
  await upsertOwnedEmbedding(row.userId, "til", row.id, buildTilEmbeddingText(row));
}

export function scheduleBookmarkEmbedding(row: EmbeddableBookmark): void {
  void upsertBookmarkEmbedding(row).catch((e) => {
    console.error("[scheduleBookmarkEmbedding]", e);
  });
}

export function scheduleTilEmbedding(row: EmbeddableTil): void {
  void upsertTilEmbedding(row).catch((e) => {
    console.error("[scheduleTilEmbedding]", e);
  });
}
