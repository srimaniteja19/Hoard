import { db } from "../src/db";
import { bookmarks } from "../src/db/schema";
import { isNull, or, eq, and } from "drizzle-orm";
import { ingestOgCoverForBookmark } from "../src/lib/covers/ogPipeline";
import { KindType } from "../src/types";

/**
 * Background OG Covers Backfill Worker (§7)
 * Processes PENDING bookmarks in batches of 5 with domain rate limiting (max 2 fetches per domain per 5s).
 */
export async function backfillOgCovers() {
  console.log("Starting OG Cover Ingestion Backfill Worker (§7)...");

  // Select bookmarks where ogStatus is PENDING or coverSource IS NULL
  const pendingBookmarks = await db
    .select({
      id: bookmarks.id,
      url: bookmarks.url,
      title: bookmarks.title,
      type: bookmarks.type,
      source: bookmarks.source,
      ogStatus: bookmarks.ogStatus,
    })
    .from(bookmarks)
    .where(
      and(
        isNull(bookmarks.deletedAt),
        or(eq(bookmarks.ogStatus, "PENDING"), isNull(bookmarks.coverSource))
      )
    );

  console.log(`Found ${pendingBookmarks.length} bookmark(s) requiring OG cover processing.`);

  if (pendingBookmarks.length === 0) {
    console.log("✅ All bookmarks have processed OG cover statuses.");
    return;
  }

  const domainFetchTimestamps = new Map<string, number[]>();

  function canFetchDomain(domain: string): boolean {
    const now = Date.now();
    const timestamps = (domainFetchTimestamps.get(domain) || []).filter((t) => now - t < 5000);
    domainFetchTimestamps.set(domain, timestamps);
    return timestamps.length < 2;
  }

  function recordDomainFetch(domain: string) {
    const timestamps = domainFetchTimestamps.get(domain) || [];
    timestamps.push(Date.now());
    domainFetchTimestamps.set(domain, timestamps);
  }

  const batchSize = 5;
  let processedCount = 0;

  for (let i = 0; i < pendingBookmarks.length; i += batchSize) {
    const batch = pendingBookmarks.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (bm) => {
        let domain = "";
        try {
          domain = new URL(bm.url).hostname;
        } catch {
          domain = bm.source;
        }

        if (domain && !canFetchDomain(domain)) {
          console.log(`⏳ Domain rate limit reached for ${domain}, delaying bookmark #${bm.id}...`);
          await new Promise((r) => setTimeout(r, 2500));
        }

        if (domain) recordDomainFetch(domain);

        const res = await ingestOgCoverForBookmark(bm.id, bm.url, bm.type as KindType);
        processedCount++;

        if (res.status === "READY") {
          console.log(`[READY] Bookmark #${bm.id} ("${bm.title}") -> Mirrored key: ${res.imageKey}`);
        } else if (res.status === "REJECTED") {
          console.log(`[REJECTED] Bookmark #${bm.id} ("${bm.title}") -> Reason: ${res.rejectReason}`);
        } else {
          console.log(`[FAILED] Bookmark #${bm.id} ("${bm.title}") -> Reason: ${res.rejectReason}`);
        }
      })
    );

    // 1-second delay between batches
    if (i + batchSize < pendingBookmarks.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log(`\n✅ Backfill worker completed: Processed ${processedCount} bookmark(s).`);
}

if (require.main === module) {
  backfillOgCovers()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Backfill worker failed:", err);
      process.exit(1);
    });
}
