import { db } from "@/db";
import { scrapAssets, ScrapAssetRow } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export async function saveScrapAsset(
  userId: string,
  params: {
    filename: string;
    mimeType: string;
    data: string; // Base64 data string
    sizeBytes: number;
    width?: number;
    height?: number;
    scrapId?: string;
  }
): Promise<ScrapAssetRow> {
  const id = crypto.randomUUID();

  const [created] = await db
    .insert(scrapAssets)
    .values({
      id,
      userId,
      filename: params.filename,
      mimeType: params.mimeType,
      data: params.data,
      sizeBytes: params.sizeBytes,
      width: params.width || null,
      height: params.height || null,
      scrapId: params.scrapId || null,
    })
    .returning();

  return created;
}

export async function getScrapAssetById(id: string): Promise<ScrapAssetRow | null> {
  const [row] = await db
    .select()
    .from(scrapAssets)
    .where(eq(scrapAssets.id, id))
    .limit(1);

  return row || null;
}

export async function deleteScrapAsset(userId: string, id: string): Promise<boolean> {
  const res = await db
    .delete(scrapAssets)
    .where(and(eq(scrapAssets.userId, userId), eq(scrapAssets.id, id)))
    .returning({ id: scrapAssets.id });

  return res.length > 0;
}
