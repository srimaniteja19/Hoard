import { db } from "@/db";
import { favicons, bookmarks } from "@/db/schema";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { storeBlob } from "@/lib/storage/blobStorage";
import { fetchAndValidateOgImage } from "./ogFetcher";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Domain-level Favicon Service (§3.5)
 * Keyed on host, shared across all bookmarks from the same domain.
 * Refreshes every 30 days. Stores as 32x32 PNG in blob storage.
 */
export async function getOrFetchFaviconForHost(host: string): Promise<string | null> {
  if (!host || !host.trim()) return null;
  const cleanHost = host.toLowerCase().trim();

  try {
    // 1. Check existing favicons row by host
    const existing = await db
      .select()
      .from(favicons)
      .where(eq(favicons.host, cleanHost))
      .limit(1);

    if (existing.length > 0) {
      const row = existing[0];
      const ageMs = Date.now() - new Date(row.updatedAt).getTime();

      // If updated within 30 days, return cached key
      if (ageMs < THIRTY_DAYS_MS && row.faviconKey) {
        return row.faviconKey;
      }
    }

    // 2. Fetch fresh favicon from domain icon endpoints / Google S2 favicon service fallback
    const faviconCandidateUrls = [
      `https://${cleanHost}/favicon.ico`,
      `https://www.google.com/s2/favicons?domain=${cleanHost}&sz=64`,
    ];

    let iconBuffer: Buffer | null = null;

    for (const url of faviconCandidateUrls) {
      const res = await fetchAndValidateOgImage(url, 2, 1);
      if (res.ok && res.buffer) {
        iconBuffer = res.buffer;
        break;
      }
    }

    if (!iconBuffer) {
      // Upsert null key so we don't spam failed domain fetches
      await db
        .insert(favicons)
        .values({
          host: cleanHost,
          faviconKey: null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: favicons.host,
          set: { updatedAt: new Date() },
        });

      return null;
    }

    // 3. Process into 32x32 PNG with metadata stripped
    const processedPng = await sharp(iconBuffer)
      .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ quality: 90 })
      .toBuffer();

    const safeHostKey = cleanHost.replace(/[^a-z0-9]/gi, "_");
    const key = `fav_${safeHostKey}.png`;
    const faviconKey = await storeBlob(key, processedPng);

    // 4. Upsert host row into favicons table
    await db
      .insert(favicons)
      .values({
        host: cleanHost,
        faviconKey,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: favicons.host,
        set: { faviconKey, updatedAt: new Date() },
      });

    // Also update any bookmarks from this host missing faviconKey
    await db
      .update(bookmarks)
      .set({ faviconKey })
      .where(eq(bookmarks.source, cleanHost));

    return faviconKey;
  } catch {
    return null;
  }
}
