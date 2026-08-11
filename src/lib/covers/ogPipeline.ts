import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { KindType } from "@/types";
import { fetchMetaForUrl } from "@/lib/fetchMeta";
import { discoverOgImageCandidate } from "./ogDiscovery";
import { fetchAndValidateOgImage } from "./ogFetcher";
import { processOgImage } from "./ogProcessor";
import { getOrFetchFaviconForHost } from "./faviconService";

export interface IngestOgCoverResult {
  status: "READY" | "REJECTED" | "FAILED";
  rejectReason?: string;
  imageKey?: string;
}

/**
 * Executes full OG Cover Ingestion Pipeline (§5) for a single bookmark:
 * Discover candidate -> SSRF fetch & validate -> Sharp process & store -> DB update.
 */
export async function ingestOgCoverForBookmark(
  bookmarkId: number,
  url: string,
  kind: KindType,
  preFetchedHtml?: string
): Promise<IngestOgCoverResult> {
  try {
    let host = "";
    try {
      host = new URL(url).hostname;
    } catch {
      // ignore
    }

    // 1. Fetch domain favicon companion asynchronously (§3.5)
    if (host) {
      getOrFetchFaviconForHost(host).catch(() => {});
    }

    // 2. Obtain HTML metadata
    let html = preFetchedHtml || "";
    if (!html) {
      try {
        const meta = await fetchMetaForUrl(url);
        html = meta.html || "";
      } catch {
        // html fetch failed
      }
    }

    // 3. Discover candidate image (§3.1)
    const candidate = discoverOgImageCandidate(html, url);

    if (!candidate) {
      await db
        .update(bookmarks)
        .set({
          coverSource: "generated",
          ogStatus: "REJECTED",
          ogRejectReason: "no_og_tag",
          updatedAt: new Date(),
        })
        .where(eq(bookmarks.id, bookmarkId));

      return { status: "REJECTED", rejectReason: "no_og_tag" };
    }

    // 4. SSRF-guarded fetch (§3.2)
    const fetchRes = await fetchAndValidateOgImage(candidate.url);

    if (!fetchRes.ok) {
      const isReject = fetchRes.rejectReason !== "fetch_timeout_or_network_error";
      const ogStatus = isReject ? "REJECTED" : "FAILED";

      await db
        .update(bookmarks)
        .set({
          coverSource: "generated",
          ogStatus,
          ogRejectReason: fetchRes.rejectReason,
          updatedAt: new Date(),
        })
        .where(eq(bookmarks.id, bookmarkId));

      return { status: ogStatus, rejectReason: fetchRes.rejectReason };
    }

    // 5. Process & Store via Sharp (§3.3)
    const keyHint = `og_bm_${bookmarkId}_${Date.now()}.webp`;
    const processed = await processOgImage(fetchRes.buffer, keyHint);

    // 6. DB Update with READY status
    await db
      .update(bookmarks)
      .set({
        coverSource: "og",
        ogStatus: "READY",
        ogImageKey: processed.key,
        ogImageWidth: processed.width,
        ogImageHeight: processed.height,
        ogDominantColor: processed.dominantColor,
        ogLqip: processed.lqip,
        updatedAt: new Date(),
      })
      .where(eq(bookmarks.id, bookmarkId));

    return {
      status: "READY",
      imageKey: processed.key,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "unknown_error";
    await db
      .update(bookmarks)
      .set({
        coverSource: "generated",
        ogStatus: "FAILED",
        ogRejectReason: errorMsg.slice(0, 40),
        updatedAt: new Date(),
      })
      .where(eq(bookmarks.id, bookmarkId));

    return { status: "FAILED", rejectReason: errorMsg };
  }
}
