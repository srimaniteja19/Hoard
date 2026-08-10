import fs from "fs";
import path from "path";

// Load .env / .env.local if present
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2]?.replace(/^['"]|['"]$/g, "").trim();
      }
    });
  }
} catch {
  // ignore
}

import { db } from "../src/db";
import { bookmarks } from "../src/db/schema";
import { cleanTitle } from "../src/lib/cleanTitle";
import { eq, isNull } from "drizzle-orm";

export async function runTitleCleanup() {
  console.log("=================================================");
  console.log("🧼 CLEANING EXISTING BOOKMARK TITLES IN DATABASE");
  console.log("=================================================");

  try {
    const rows = await db
      .select({
        id: bookmarks.id,
        title: bookmarks.title,
        url: bookmarks.url,
      })
      .from(bookmarks)
      .where(isNull(bookmarks.deletedAt));

    console.log(`Checking ${rows.length} active bookmarks...`);

    let updatedCount = 0;

    for (const r of rows) {
      const cleaned = cleanTitle(r.title, r.url);
      if (cleaned !== r.title) {
        console.log(`[ID ${r.id}] "${r.title}" -> "${cleaned}"`);
        await db
          .update(bookmarks)
          .set({ title: cleaned, updatedAt: new Date() })
          .where(eq(bookmarks.id, r.id));
        updatedCount++;
      }
    }

    console.log(`\n✓ Title cleanup complete! Updated ${updatedCount} rows.`);
  } catch (err) {
    console.error("Error during title cleanup script:", err);
  }
}

if (require.main === module) {
  runTitleCleanup().then(() => process.exit(0));
}
