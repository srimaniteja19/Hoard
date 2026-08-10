import { db } from "../src/db";
import { users, tilEntries, tags, tilEntryTags, bookmarks, collections } from "../src/db/schema";
import { getLoggedForDate, generateShortHash, getTilHeatmap, getTilStreak } from "../src/lib/dal/til";
import { eq } from "drizzle-orm";

export const NON_UTC_USER_ID = "usr_test_pacific";
export const NON_UTC_TIMEZONE = "America/Los_Angeles";

export async function seedTilData() {
  console.log("🌱 Starting Phase 1 TIL Seeding for all database users...");

  const allUsers = await db.select().from(users);
  console.log(`Found ${allUsers.length} user(s) to seed.`);

  for (const targetUser of allUsers) {
    const userId = targetUser.id;
    console.log(`\nSeeding TIL entries for user: ${userId} (${targetUser.email})...`);

    // Clean existing TIL entries for target user
    await db.delete(tilEntries).where(eq(tilEntries.userId, userId));

  // 3. Create sample tags
  const tagNames = ["typescript", "drizzle", "nextjs", "security", "css"];
  const tagMap = new Map<string, number>();

  for (const tagName of tagNames) {
    const existing = await db
      .select()
      .from(tags)
      .where(eq(tags.name, tagName));

    if (existing.length > 0) {
      tagMap.set(tagName, existing[0].id);
    } else {
      const [inserted] = await db
        .insert(tags)
        .values({
          userId: NON_UTC_USER_ID,
          name: tagName,
          color: "#00F0FF",
        })
        .returning();
      tagMap.set(tagName, inserted.id);
    }
  }

  // 4. Generate 20 entries across 14 distinct days in the last 20 days
  // Days offset pattern (14 distinct days):
  // Offset 0: 3 entries
  // Offset 1: 3 entries
  // Offset 2: 2 entries
  // Offsets 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 15: 1 entry each
  // Total = 3 + 3 + 2 + 12 = 20 entries
  const dayOffsets = [
    0, 0,
    1, 1,
    2, 2,
    3, 3,
    4, 4,
    6, 6,
    7, 8, 9, 11, 12, 13, 14, 15
  ];

  const sampleEntries = [
    { type: "FACT" as const, body: "Drizzle `date()` column stores string YYYY-MM-DD format in PostgreSQL." },
    { type: "GOTCHA" as const, body: "Executing JS Date `.toISOString()` in UTC can shift 6pm Pacific time to tomorrow." },
    { type: "SNIPPET" as const, body: "Intl.DateTimeFormat with timeZone option accurately converts dates.", code: "new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())", codeLang: "typescript" },
    { type: "PATTERN" as const, body: "Using short 4-char hex hashes per user reduces permalink length significantly." },
    { type: "QUOTE" as const, body: "The secret to effective learning is atomic notes over long essays." },
    { type: "OPINION" as const, body: "Markdown-lite with inline code is better for quick TIL entries than full WYSIWYG." },
    { type: "LINK" as const, body: "Great paper on database indexing techniques for temporal data.", linkUrl: "https://arxiv.org/abs/2103.00020" },
    { type: "FACT" as const, body: "Chrome MV3 extensions must handle background service worker lifecycles properly." },
    { type: "GOTCHA" as const, body: "SameSite cookies across origins can fail silently in modern Chrome background scripts." },
    { type: "SNIPPET" as const, body: "Zod schema validation with safeParse prevents runtime type crashes.", code: "const res = schema.safeParse(input);", codeLang: "typescript" },
    { type: "PATTERN" as const, body: "SSRF guard must validate DNS lookup IP address against private subnets." },
    { type: "QUOTE" as const, body: "HOARD is a ledger of debt; TIL is the ledger of gains." },
    { type: "FACT" as const, body: "oEmbed API endpoint for YouTube returns title and author, but duration requires Data API v3." },
    { type: "OPINION" as const, body: "Facade play buttons over video embeds drastically improve initial page load performance." },
    { type: "GOTCHA" as const, body: "Always use youtube-nocookie.com to avoid pre-consent tracking cookies." },
    { type: "FACT" as const, body: "Next.js server actions handle form submits cleanly without extra API boilerplate." },
    { type: "PATTERN" as const, body: "Skip-day allowance of 2 days per month prevents streak breakage from ruining motivation." },
    { type: "SNIPPET" as const, body: "CSS glassmorphism backdrop filter fallback.", code: "backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);", codeLang: "css" },
    { type: "FACT" as const, body: "Better-Auth supports custom bearer token verification middleware." },
    { type: "GOTCHA" as const, body: "Always mirror third-party embed thumbnails to internal storage to avoid IP leaks." },
  ];

  console.log(`✓ Creating 20 TIL entries across 14 days for ${NON_UTC_TIMEZONE}...`);

    const now = new Date();
    for (let i = 0; i < sampleEntries.length; i++) {
      const sample = sampleEntries[i];
      const offsetDays = dayOffsets[i];
      const targetDate = new Date(now.getTime() - offsetDays * 24 * 60 * 60 * 1000);
      const loggedFor = getLoggedForDate("America/Los_Angeles", targetDate);
      const shortHash = await generateShortHash(userId);

      const [inserted] = await db
        .insert(tilEntries)
        .values({
          userId,
          shortHash,
          type: sample.type,
          body: sample.body,
          code: sample.code || null,
          codeLang: sample.codeLang || null,
          linkUrl: sample.linkUrl || null,
          loggedFor,
          createdAt: targetDate,
          updatedAt: targetDate,
        })
        .returning();

      const tagName = tagNames[i % tagNames.length];
      const tagId = tagMap.get(tagName);

      if (tagId) {
        await db.insert(tilEntryTags).values({
          tilId: inserted.id,
          tagId,
        }).onConflictDoNothing();
      }
    }
  }

  console.log("✓ Seeded entries for all users successfully!");

  // 5. Query Heatmap and Streak for verification
  console.log("\n📊 Verification Queries:");

  const heatmap = await getTilHeatmap(NON_UTC_USER_ID, NON_UTC_TIMEZONE);
  const activeDaysCount = Object.keys(heatmap).length;
  const totalEntriesCount = Object.values(heatmap).reduce((a, b) => a + b, 0);

  console.log(`- Heatmap distinct active days count: ${activeDaysCount} (expected: 14)`);
  console.log(`- Heatmap total entries count: ${totalEntriesCount} (expected: 20)`);

  const streak = await getTilStreak(NON_UTC_USER_ID, NON_UTC_TIMEZONE);
  console.log(`- Current Streak: ${streak.currentStreak}`);
  console.log(`- Longest Streak: ${streak.longestStreak}`);
  console.log(`- Streak at Risk: ${streak.streakAtRisk}`);
  console.log(`- Skips Used This Month: ${streak.skipsUsedThisMonth}`);

  if (activeDaysCount === 14 && totalEntriesCount === 20) {
    console.log("\n✅ PHASE 1 VERIFICATION SUCCESSFUL!");
  } else {
    console.error("\n❌ PHASE 1 VERIFICATION FAILED: Counts mismatch");
    process.exit(1);
  }
}

if (require.main === module) {
  seedTilData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed script failed:", err);
      process.exit(1);
    });
}
