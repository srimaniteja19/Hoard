import { db } from "../src/db";
import { tilEntries, users } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function testTilFetch() {
  console.log("🔍 Checking TIL entries in database...");

  const allUsers = await db.select({ id: users.id, email: users.email }).from(users);
  console.log(`Found ${allUsers.length} user(s):`, allUsers);

  for (const u of allUsers) {
    const entries = await db.select().from(tilEntries).where(eq(tilEntries.userId, u.id));
    console.log(`User ${u.id} (${u.email || "no email"}) has ${entries.length} TIL entries.`);
    if (entries.length > 0) {
      console.log(`Sample entry:`, {
        id: entries[0].id,
        shortHash: entries[0].shortHash,
        type: entries[0].type,
        body: entries[0].body,
        loggedFor: entries[0].loggedFor,
      });
    }
  }
}

testTilFetch()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  });
