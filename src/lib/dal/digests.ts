import { db } from "@/db";
import { savedDigests, SavedDigestRow } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { extractYouTubeVideoId } from "@/lib/cleanTitle";

let tableEnsured = false;
async function ensureTable() {
  if (tableEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS saved_digests (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        video_id text NOT NULL,
        url text NOT NULL,
        title text NOT NULL,
        author text,
        content text NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      )
    `);
    try {
      await db.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS user_video_digest_idx ON saved_digests(user_id, video_id)
      `);
    } catch {
      // index may already exist
    }
    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS user_digest_url_idx ON saved_digests(user_id, url)
      `);
    } catch {
      // index may already exist
    }
    tableEnsured = true;
  } catch (err) {
    console.error("[ensureTable saved_digests]", err);
  }
}

export async function getSavedDigest(
  userId: string,
  urlOrVideoId: string
): Promise<SavedDigestRow | null> {
  await ensureTable();
  const videoId =
    urlOrVideoId.length === 11 && !urlOrVideoId.includes("/")
      ? urlOrVideoId
      : extractYouTubeVideoId(urlOrVideoId) || urlOrVideoId;

  const rows = await db
    .select()
    .from(savedDigests)
    .where(
      and(
        eq(savedDigests.userId, userId),
        eq(savedDigests.videoId, videoId)
      )
    )
    .limit(1);

  return rows[0] || null;
}

export async function saveDigest(
  userId: string,
  data: {
    videoId?: string;
    url: string;
    title: string;
    author?: string;
    content: string;
  }
): Promise<SavedDigestRow> {
  await ensureTable();
  const videoId = data.videoId || extractYouTubeVideoId(data.url) || data.url;

  const existing = await getSavedDigest(userId, videoId);
  const now = new Date();

  if (existing) {
    const [updated] = await db
      .update(savedDigests)
      .set({
        title: data.title,
        author: data.author,
        content: data.content,
        updatedAt: now,
      })
      .where(
        and(
          eq(savedDigests.userId, userId),
          eq(savedDigests.videoId, videoId)
        )
      )
      .returning();
    return updated;
  }

  const [inserted] = await db
    .insert(savedDigests)
    .values({
      id: crypto.randomUUID(),
      userId,
      videoId,
      url: data.url,
      title: data.title,
      author: data.author,
      content: data.content,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return inserted;
}

export async function getAllSavedDigests(userId: string): Promise<SavedDigestRow[]> {
  await ensureTable();
  return await db
    .select()
    .from(savedDigests)
    .where(eq(savedDigests.userId, userId))
    .orderBy(desc(savedDigests.updatedAt));
}

export async function deleteSavedDigest(
  userId: string,
  urlOrVideoId: string
): Promise<boolean> {
  await ensureTable();
  const videoId =
    urlOrVideoId.length === 11 && !urlOrVideoId.includes("/")
      ? urlOrVideoId
      : extractYouTubeVideoId(urlOrVideoId) || urlOrVideoId;

  const res = await db
    .delete(savedDigests)
    .where(
      and(
        eq(savedDigests.userId, userId),
        eq(savedDigests.videoId, videoId)
      )
    );

  return true;
}
