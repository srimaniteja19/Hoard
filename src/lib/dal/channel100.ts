import { db } from "@/db";
import { channel100Entries } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  Channel100Store,
  ShowStatus,
  ShowUserRecord,
  CustomMediaItem,
} from "@/lib/channel100/types";

/**
 * Fetch all Channel 100 entries for the authenticated user and format as Channel100Store.
 */
export async function getUserChannel100Store(userId: string): Promise<Channel100Store> {
  const rows = await db
    .select()
    .from(channel100Entries)
    .where(eq(channel100Entries.userId, userId));

  const shows: Record<string, ShowUserRecord> = {};
  const custom: Record<string, CustomMediaItem> = {};
  let latestUpdated = 0;

  for (const row of rows) {
    const updatedAt = row.updatedAt ? new Date(row.updatedAt).getTime() : 0;
    if (updatedAt > latestUpdated) {
      latestUpdated = updatedAt;
    }

    // Check if entry is a custom logged title
    if (row.mediaId.startsWith("c_") && row.notes) {
      try {
        if (row.notes.startsWith("{")) {
          const parsed = JSON.parse(row.notes);
          if (parsed && parsed.isCustom) {
            custom[row.mediaId] = {
              id: row.mediaId,
              title: parsed.title || "Untitled",
              kind: parsed.kind || "tv",
              lang: parsed.lang || "English",
              langFlag: parsed.langFlag,
              status: (row.status as ShowStatus) || "",
              rating: row.rating || 0,
              year: parsed.year,
              where: parsed.where || "Streaming",
              genre: parsed.genre || "Entertainment",
              season: parsed.season,
              episode: parsed.episode,
              totalEpisodes: parsed.totalEpisodes,
              runtimeMins: parsed.runtimeMins,
              notes: parsed.notes || "",
              icon: parsed.icon,
              color: parsed.color,
              updatedAt,
            };
            shows[row.mediaId] = {
              s: (row.status as ShowStatus) || "",
              r: row.rating || 0,
              n: parsed.notes || undefined,
              updatedAt,
            };
            continue;
          }
        }
      } catch {
        // Fallback to standard show record
      }
    }

    // Only include if has status, rating, or notes
    if (row.status || (row.rating && row.rating > 0) || row.notes) {
      shows[row.mediaId] = {
        s: (row.status as ShowStatus) || "",
        r: row.rating || 0,
        n: row.notes || undefined,
        updatedAt,
      };
    }
  }

  return {
    shows,
    custom,
    updated: latestUpdated || Date.now(),
  };
}

/**
 * Save or delete a single entry for the user (standard or custom).
 */
export async function upsertChannel100Entry(
  userId: string,
  mediaId: string,
  record: ShowUserRecord,
  customMeta?: Partial<CustomMediaItem>
): Promise<void> {
  const hasContent =
    Boolean(record.s) ||
    Boolean(record.r && record.r > 0) ||
    Boolean(record.n && record.n.trim()) ||
    Boolean(customMeta);

  if (!hasContent) {
    // Delete entry if cleared
    await db
      .delete(channel100Entries)
      .where(
        and(
          eq(channel100Entries.userId, userId),
          eq(channel100Entries.mediaId, mediaId)
        )
      );
    return;
  }

  const now = new Date(record.updatedAt || Date.now());

  const notesToSave = customMeta
    ? JSON.stringify({
        isCustom: true,
        title: customMeta.title,
        kind: customMeta.kind,
        lang: customMeta.lang,
        langFlag: customMeta.langFlag,
        year: customMeta.year,
        where: customMeta.where,
        genre: customMeta.genre,
        season: customMeta.season,
        episode: customMeta.episode,
        totalEpisodes: customMeta.totalEpisodes,
        runtimeMins: customMeta.runtimeMins,
        notes: customMeta.notes || record.n || "",
        icon: customMeta.icon,
        color: customMeta.color,
      })
    : record.n || null;

  await db
    .insert(channel100Entries)
    .values({
      userId,
      mediaId,
      status: record.s || "",
      rating: record.r || 0,
      notes: notesToSave,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [channel100Entries.userId, channel100Entries.mediaId],
      set: {
        status: record.s || "",
        rating: record.r || 0,
        notes: notesToSave,
        updatedAt: now,
      },
    });
}

/**
 * Delete a specific entry for the user.
 */
export async function deleteChannel100Entry(
  userId: string,
  mediaId: string
): Promise<void> {
  await db
    .delete(channel100Entries)
    .where(
      and(
        eq(channel100Entries.userId, userId),
        eq(channel100Entries.mediaId, mediaId)
      )
    );
}

/**
 * Two-way sync: Merges client store with database entries and returns the combined state.
 */
export async function syncChannel100Store(
  userId: string,
  clientShows: Record<string, ShowUserRecord>,
  clientCustom?: Record<string, CustomMediaItem>
): Promise<Channel100Store> {
  const dbStore = await getUserChannel100Store(userId);
  const mergedShows: Record<string, ShowUserRecord> = { ...dbStore.shows };
  const mergedCustom: Record<string, CustomMediaItem> = { ...(dbStore.custom || {}) };

  const entriesToUpsert: {
    userId: string;
    mediaId: string;
    status: string;
    rating: number;
    notes: string | null;
    updatedAt: Date;
  }[] = [];

  const now = new Date();

  // Merge custom entries from client
  if (clientCustom) {
    for (const [mediaId, customItem] of Object.entries(clientCustom)) {
      const dbCustom = mergedCustom[mediaId];
      const clientTime = customItem.updatedAt || 0;
      const dbTime = dbCustom?.updatedAt || 0;

      if (!dbCustom || clientTime >= dbTime) {
        mergedCustom[mediaId] = customItem;
        mergedShows[mediaId] = {
          s: customItem.status,
          r: customItem.rating,
          n: customItem.notes,
          updatedAt: clientTime,
        };

        entriesToUpsert.push({
          userId,
          mediaId,
          status: customItem.status || "",
          rating: customItem.rating || 0,
          notes: JSON.stringify({
            isCustom: true,
            title: customItem.title,
            kind: customItem.kind,
            lang: customItem.lang,
            langFlag: customItem.langFlag,
            year: customItem.year,
            where: customItem.where,
            genre: customItem.genre,
            season: customItem.season,
            episode: customItem.episode,
            totalEpisodes: customItem.totalEpisodes,
            runtimeMins: customItem.runtimeMins,
            notes: customItem.notes || "",
            icon: customItem.icon,
            color: customItem.color,
          }),
          updatedAt: clientTime ? new Date(clientTime) : now,
        });
      }
    }
  }

  // Merge standard show records
  for (const [mediaId, clientRec] of Object.entries(clientShows)) {
    if (mediaId.startsWith("c_")) continue; // already handled above

    const dbRec = dbStore.shows[mediaId];
    const clientTime = clientRec.updatedAt || 0;
    const dbTime = dbRec?.updatedAt || 0;

    // If client is newer or DB doesn't have it yet, client wins
    if (!dbRec || clientTime >= dbTime) {
      if (clientRec.s || clientRec.r || clientRec.n) {
        mergedShows[mediaId] = clientRec;
        entriesToUpsert.push({
          userId,
          mediaId,
          status: clientRec.s || "",
          rating: clientRec.r || 0,
          notes: clientRec.n || null,
          updatedAt: clientRec.updatedAt ? new Date(clientRec.updatedAt) : now,
        });
      }
    }
  }

  // Batch upsert client updates into the database
  if (entriesToUpsert.length > 0) {
    for (const entry of entriesToUpsert) {
      await db
        .insert(channel100Entries)
        .values(entry)
        .onConflictDoUpdate({
          target: [channel100Entries.userId, channel100Entries.mediaId],
          set: {
            status: entry.status,
            rating: entry.rating,
            notes: entry.notes,
            updatedAt: entry.updatedAt,
          },
        });
    }
  }

  return {
    shows: mergedShows,
    custom: mergedCustom,
    updated: Date.now(),
  };
}
