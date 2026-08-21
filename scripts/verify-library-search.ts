/**
 * Phase 4 verification for LIBRARY.md §4: confirms searchLibrary() actually
 * finds a phrase that only exists in archivedText (proving the tsvector
 * indexes body text, not just titles — the whole point of this phase, since
 * the app's prior client-side search never looked past title/tag/note), and
 * that a higher useCount lifts an otherwise-equal text match above a lower
 * one (the ln(use_count + 1) blend from LIBRARY.md's ranking formula).
 *
 * Scoped entirely to a synthetic user this script creates and owns — same
 * safe pattern as scripts/verify-home-edition.ts.
 *
 * Run: npx tsx --env-file=.env.local scripts/verify-library-search.ts
 */

import { db } from "../src/db";
import { users, collections, bookmarks, embeddings } from "../src/db/schema";
import { eq, and } from "drizzle-orm";
import { searchLibrary } from "../src/lib/library/searchLibrary";

const USER_ID = "usr_verify_library_search";
const USER_EMAIL = "verify-library-search@hoard.test";
const COLL_ID = "usr_verify_library_search-unsorted";

async function ensureUser(): Promise<void> {
  const existing = await db.select().from(users).where(eq(users.id, USER_ID)).limit(1);
  if (existing.length === 0) {
    await db.insert(users).values({
      id: USER_ID,
      name: "Verify Library Search (synthetic)",
      email: USER_EMAIL,
      emailVerified: true,
      timezone: "UTC",
    });
  }

  const existingColl = await db.select().from(collections).where(eq(collections.id, COLL_ID)).limit(1);
  if (existingColl.length === 0) {
    await db.insert(collections).values({ id: COLL_ID, userId: USER_ID, name: "Unsorted" });
  }

  await db.delete(bookmarks).where(eq(bookmarks.userId, USER_ID));
}

const FTS_ONLY = { embedQuery: async () => null as number[] | null };

function sentinelVector(): number[] {
  const v = new Array(1536).fill(0);
  v[0] = 1;
  return v;
}

async function embeddingsTableReady(): Promise<boolean> {
  try {
    await db.select({ id: embeddings.id }).from(embeddings).limit(1);
    return true;
  } catch {
    return false;
  }
}

async function seed() {
  const base = {
    userId: USER_ID,
    collectionId: COLL_ID,
    type: "DOC" as const,
    source: "test",
    tag: "test",
  };

  await db.insert(bookmarks).values([
    {
      ...base,
      title: "Weekly infrastructure newsletter",
      url: "https://example.com/verify-search/body-match",
      archivedText: "This week's deep dive covers zk-snark verification circuits in detail.",
      useCount: 3,
    },
    {
      ...base,
      title: "Unrelated cooking blog post",
      url: "https://example.com/verify-search/no-match",
      archivedText: "A recipe for sourdough bread with a long fermentation time.",
      useCount: 100,
    },
    {
      ...base,
      title: "Rarely used circuits reference",
      url: "https://example.com/verify-search/low-use",
      archivedText: "Notes on zk-snark verification circuits, rarely revisited.",
      useCount: 0,
    },
    {
      ...base,
      title: "Frequently used circuits reference",
      url: "https://example.com/verify-search/high-use",
      archivedText: "Notes on zk-snark verification circuits, checked constantly.",
      useCount: 80,
    },
  ]);
}

async function main() {
  await ensureUser();
  await seed();

  const checks: [string, boolean][] = [];

  // 1. Body-text discoverability: the phrase only ever appears in archivedText,
  // never in any title — client-side title/tag/note search could never have
  // found this before this phase.
  // FTS checks pin embedQuery to null so a missing Gateway key (or a live
  // vector index) cannot change keyword ranking. Hybrid is checked separately.
  const bodyResults = await searchLibrary(USER_ID, "zk-snark verification circuits", 20, FTS_ONLY);
  const bodyUrls = bodyResults.map((r) => r.url);
  checks.push([
    "body-only phrase match is found via archivedText",
    bodyUrls.includes("https://example.com/verify-search/body-match"),
  ]);
  checks.push([
    "unrelated bookmark (no phrase overlap) is excluded despite huge useCount",
    !bodyUrls.includes("https://example.com/verify-search/no-match"),
  ]);

  // 2. useCount blend: two bookmarks with an equally strong text match (same
  // phrase, same field, same weight) should rank by useCount — proving the
  // ln(use_count + 1) multiplier in the ranking query actually does something.
  const useCountResults = bodyResults.filter((r) =>
    r.url.endsWith("/low-use") || r.url.endsWith("/high-use")
  );
  const highIdx = useCountResults.findIndex((r) => r.url.endsWith("/high-use"));
  const lowIdx = useCountResults.findIndex((r) => r.url.endsWith("/low-use"));
  checks.push([
    "both equal-text-match bookmarks are found",
    highIdx !== -1 && lowIdx !== -1,
  ]);
  checks.push([
    "higher useCount (80) ranks above lower useCount (0) for an equal text match",
    highIdx !== -1 && lowIdx !== -1 && highIdx < lowIdx,
  ]);

  // 3. Hybrid: a sentinel embedding on the cooking post should surface it for
  // a query with no keyword overlap ("burnout and deep work"), proving vector
  // neighbors are fused in even when FTS returns nothing.
  if (await embeddingsTableReady()) {
    await db.delete(embeddings).where(eq(embeddings.userId, USER_ID));
    const [cooking] = await db
      .select({ id: bookmarks.id })
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, USER_ID), eq(bookmarks.url, "https://example.com/verify-search/no-match")))
      .limit(1);
    if (!cooking) {
      checks.push(["vector-only conceptual neighbor is returned when FTS has no keyword overlap", false]);
    } else {
      const vec = sentinelVector();
      await db.insert(embeddings).values({
        userId: USER_ID,
        ownerType: "bookmark",
        ownerId: String(cooking.id),
        embedding: vec,
        model: "openai/text-embedding-3-small",
        contentHash: "verify-sentinel",
      });
      const conceptual = await searchLibrary(USER_ID, "burnout and deep work", 20, {
        embedQuery: async () => vec,
      });
      checks.push([
        "vector-only conceptual neighbor is returned when FTS has no keyword overlap",
        conceptual.some((r) => r.url.endsWith("/no-match")),
      ]);
      await db.delete(embeddings).where(eq(embeddings.userId, USER_ID));
    }
  } else {
    console.log("↷ vector-only conceptual neighbor (skipped — apply drizzle/0008 embeddings first)");
  }

  let failed = 0;
  for (const [label, ok] of checks) {
    console.log(`${ok ? "✓" : "✗"} ${label}`);
    if (!ok) failed++;
  }

  await db.delete(bookmarks).where(and(eq(bookmarks.userId, USER_ID)));
  try {
    await db.delete(embeddings).where(eq(embeddings.userId, USER_ID));
  } catch {
    // embeddings table may not exist yet
  }

  if (failed === 0) {
    console.log("\n✅ PHASE 4 LIBRARY SEARCH VERIFICATION SUCCESSFUL!");
  } else {
    console.error(`\n❌ PHASE 4 VERIFICATION FAILED: ${failed} check(s) failed`);
    process.exit(1);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Verification script failed:", err);
      process.exit(1);
    });
}
