/**
 * Heavy seed script for performance-testing the Spectacle features (SPECTACLE.md).
 *
 * Seeds 2,000 TIL entries over 400 days across 40 tags, and 5,000 bookmarks,
 * entirely under one synthetic user this script creates itself. It never touches
 * any other user's rows — every delete/insert is scoped to SEED_USER_ID.
 *
 * The existing scripts/seed-til.ts is NOT a safe template to copy: it loops over
 * every real user in the `users` table and deletes+reseeds their TIL entries. On
 * this database that loop's only iteration is the real account. This script is
 * deliberately structured differently so that can never happen here.
 *
 * Run: npx tsx --env-file=.env.local scripts/seed-heavy.ts
 */

import { db } from "../src/db";
import { users, tilEntries, tags, tilEntryTags, collections, bookmarks } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { getLoggedForDate } from "../src/lib/dal/til";
import type { TilType } from "../src/db/schema";
import type { KindType } from "../src/types";

// Overridable so this can seed a real, browser-loginable account for live
// perf/QA testing (e.g. a disposable signup) without touching the default
// synthetic user this script creates on its own.
const SEED_USER_ID = process.env.SEED_TARGET_USER_ID || "usr_seed_heavy";
const SEED_USER_EMAIL = process.env.SEED_TARGET_USER_EMAIL || "seed-heavy@hoard.test";
const SEED_TIMEZONE = "UTC";

const TIL_TYPES: TilType[] = ["FACT", "GOTCHA", "SNIPPET", "PATTERN", "QUOTE", "OPINION", "LINK"];
const KIND_TYPES: KindType[] = ["ART", "VID", "PLY", "GIT", "APP", "PPR", "DOC"];

const TAG_COUNT = 40;
const TIL_COUNT = process.env.SEED_TIL_COUNT ? Number(process.env.SEED_TIL_COUNT) : 2000;
const TIL_DAY_SPAN = 400;
const BOOKMARK_COUNT = process.env.SEED_BOOKMARK_COUNT ? Number(process.env.SEED_BOOKMARK_COUNT) : 5000;
const CHUNK_SIZE = 250;

const TOPIC_WORDS = [
  "postgres", "typescript", "react", "css", "docker", "kubernetes", "aws", "graphql",
  "redis", "webpack", "vite", "rust", "go", "python", "security", "auth", "testing",
  "performance", "accessibility", "design-systems", "api-design", "caching", "queues",
  "observability", "ci-cd", "terraform", "networking", "concurrency", "databases", "search",
  "machine-learning", "llm", "vector-search", "css-grid", "animations", "web-workers",
  "service-workers", "http", "websockets", "compilers",
];

function assertTagCoverage() {
  if (TOPIC_WORDS.length < TAG_COUNT) {
    throw new Error(`Need ${TAG_COUNT} topic words, only have ${TOPIC_WORDS.length}`);
  }
}

const BODY_TEMPLATES = [
  "$TOPIC entries under load need aggregate-first queries, not per-row fetches.",
  "The naive approach to $TOPIC works fine on seed data and falls over on a real dataset.",
  "$TOPIC configuration defaults are conservative; tune them once you know your real traffic shape.",
  "Debugging $TOPIC issues is easier with structured logs than console.log scattered everywhere.",
  "$TOPIC has a subtle gotcha around ordering that only shows up under concurrent writes.",
  "Cache invalidation for $TOPIC data should be tied to the write path, not a timer.",
  "$TOPIC's docs undersell how much the defaults matter for production workloads.",
];

function randInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function pick<T>(arr: T[]): T {
  return arr[randInt(arr.length)];
}

function randomHex4(seen: Set<string>): string {
  let hash: string;
  do {
    hash = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0");
  } while (seen.has(hash));
  seen.add(hash);
  return hash;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function ensureSeedUser(): Promise<void> {
  const existing = await db.select().from(users).where(eq(users.id, SEED_USER_ID)).limit(1);
  if (existing.length > 0) return;

  await db.insert(users).values({
    id: SEED_USER_ID,
    name: "Seed Heavy (synthetic, perf testing only)",
    email: SEED_USER_EMAIL,
    emailVerified: true,
    timezone: SEED_TIMEZONE,
  });
  console.log(`Created synthetic seed user ${SEED_USER_ID} <${SEED_USER_EMAIL}>`);
}

async function wipeSeedUserData(): Promise<void> {
  // Scoped exclusively to SEED_USER_ID — never touches any other user's rows.
  await db.delete(tilEntries).where(eq(tilEntries.userId, SEED_USER_ID));
  await db.delete(bookmarks).where(eq(bookmarks.userId, SEED_USER_ID));
  await db.delete(collections).where(eq(collections.userId, SEED_USER_ID));
  await db.delete(tags).where(eq(tags.userId, SEED_USER_ID));
}

async function seedTags(): Promise<Map<string, number>> {
  const tagMap = new Map<string, number>();
  const rows = TOPIC_WORDS.slice(0, TAG_COUNT).map((name) => ({
    userId: SEED_USER_ID,
    name,
    color: "#00F0FF",
  }));
  const inserted = await db.insert(tags).values(rows).returning({ id: tags.id, name: tags.name });
  for (const row of inserted) tagMap.set(row.name, row.id);
  return tagMap;
}

async function seedTilEntries(tagMap: Map<string, number>): Promise<void> {
  const tagNames = Array.from(tagMap.keys());
  const seenHashes = new Set<string>();
  const now = new Date();

  type PendingEntry = {
    userId: string;
    shortHash: string;
    type: TilType;
    body: string;
    loggedFor: string;
    createdAt: Date;
    updatedAt: Date;
    tagName: string;
    secondTagName: string | null;
  };

  const pending: PendingEntry[] = [];
  for (let i = 0; i < TIL_COUNT; i++) {
    const dayOffset = randInt(TIL_DAY_SPAN);
    const createdAt = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    const loggedFor = getLoggedForDate(SEED_TIMEZONE, createdAt);
    const topic = pick(tagNames);
    const body = pick(BODY_TEMPLATES).replace(/\$TOPIC/g, topic);
    const secondTag = Math.random() < 0.4 ? pick(tagNames.filter((t) => t !== topic)) : null;

    pending.push({
      userId: SEED_USER_ID,
      shortHash: randomHex4(seenHashes),
      type: pick(TIL_TYPES),
      body,
      loggedFor,
      createdAt,
      updatedAt: createdAt,
      tagName: topic,
      secondTagName: secondTag,
    });
  }

  let inserted = 0;
  for (const batch of chunk(pending, CHUNK_SIZE)) {
    const rows = await db
      .insert(tilEntries)
      .values(
        batch.map((e) => ({
          userId: e.userId,
          shortHash: e.shortHash,
          type: e.type,
          body: e.body,
          loggedFor: e.loggedFor,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        }))
      )
      .returning({ id: tilEntries.id, shortHash: tilEntries.shortHash });

    const hashToId = new Map(rows.map((r) => [r.shortHash, r.id]));
    const tagRows: { tilId: string; tagId: number }[] = [];
    for (const e of batch) {
      const id = hashToId.get(e.shortHash);
      if (!id) continue;
      const primaryTagId = tagMap.get(e.tagName);
      if (primaryTagId) tagRows.push({ tilId: id, tagId: primaryTagId });
      if (e.secondTagName) {
        const secondTagId = tagMap.get(e.secondTagName);
        if (secondTagId) tagRows.push({ tilId: id, tagId: secondTagId });
      }
    }
    if (tagRows.length > 0) {
      await db.insert(tilEntryTags).values(tagRows).onConflictDoNothing();
    }

    inserted += rows.length;
    process.stdout.write(`\r  TIL entries: ${inserted}/${TIL_COUNT}`);
  }
  console.log();
}

const COLLECTION_NAMES = ["Unsorted", "Read queue", "Listen shelf", "Build shelf", "Data & storage"];

async function seedCollections(): Promise<string[]> {
  const rows = COLLECTION_NAMES.map((name, i) => ({
    id: `${SEED_USER_ID}-c${i}`,
    userId: SEED_USER_ID,
    name,
  }));
  const inserted = await db.insert(collections).values(rows).returning({ id: collections.id });
  return inserted.map((r) => r.id);
}

async function seedBookmarks(collectionIds: string[]): Promise<void> {
  const rows = Array.from({ length: BOOKMARK_COUNT }, (_, i) => ({
    userId: SEED_USER_ID,
    title: `Seed bookmark #${i} — ${pick(TOPIC_WORDS)}`,
    type: pick(KIND_TYPES),
    source: `example-source-${i % 200}.test`,
    url: `https://example-source-${i % 200}.test/article-${i}`,
    mins: 3 + randInt(25),
    tag: pick(TOPIC_WORDS),
    collectionId: pick(collectionIds),
    unread: Math.random() < 0.6,
  }));

  let inserted = 0;
  for (const batch of chunk(rows, CHUNK_SIZE)) {
    await db.insert(bookmarks).values(batch).onConflictDoNothing();
    inserted += batch.length;
    process.stdout.write(`\r  Bookmarks: ${inserted}/${BOOKMARK_COUNT}`);
  }
  console.log();
}

async function verify(): Promise<void> {
  const [tilCount] = await db
    .select({ id: tilEntries.id })
    .from(tilEntries)
    .where(eq(tilEntries.userId, SEED_USER_ID));
  const tilRows = await db.select().from(tilEntries).where(eq(tilEntries.userId, SEED_USER_ID));
  const bookmarkRows = await db.select().from(bookmarks).where(eq(bookmarks.userId, SEED_USER_ID));

  console.log(`\nVerification:`);
  console.log(`  TIL entries for ${SEED_USER_ID}: ${tilRows.length} (expected ${TIL_COUNT})`);
  console.log(`  Bookmarks for ${SEED_USER_ID}: ${bookmarkRows.length} (expected ${BOOKMARK_COUNT})`);

  if (tilRows.length !== TIL_COUNT || bookmarkRows.length !== BOOKMARK_COUNT) {
    console.error("\n❌ SEED VERIFICATION FAILED: counts mismatch");
    process.exit(1);
  }
  console.log("\n✅ SEED VERIFICATION SUCCESSFUL");
  void tilCount;
}

async function main() {
  const url = process.env.DATABASE_URL || "";
  const host = url.match(/@([^/]+)\//)?.[1] || "(unknown host — check DATABASE_URL)";
  console.log(`Target database host: ${host}`);
  console.log(`Scoping ALL writes to userId = "${SEED_USER_ID}" only.\n`);

  assertTagCoverage();
  await ensureSeedUser();
  await wipeSeedUserData();

  console.log("Seeding tags...");
  const tagMap = await seedTags();
  console.log(`  ${tagMap.size} tags created`);

  console.log("Seeding TIL entries...");
  await seedTilEntries(tagMap);

  console.log("Seeding collections...");
  const collectionIds = await seedCollections();
  console.log(`  ${collectionIds.length} collections created`);

  console.log("Seeding bookmarks...");
  await seedBookmarks(collectionIds);

  await verify();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Heavy seed failed:", err);
    process.exit(1);
  });
