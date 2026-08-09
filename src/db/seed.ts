import { db } from "./index";
import { users, collections, bookmarks } from "./schema";
import { INITIAL_BOOKMARKS, COLLS } from "../data/initialBookmarks";
import { DEFAULT_SINGLE_TENANT_USER_ID } from "../lib/auth";
import { eq } from "drizzle-orm";

export async function seedDatabase() {
  try {
    // 1. Ensure Default Single-Tenant Owner User exists
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, DEFAULT_SINGLE_TENANT_USER_ID));

    if (existingUsers.length === 0) {
      await db.insert(users).values({
        id: DEFAULT_SINGLE_TENANT_USER_ID,
        name: "Maniteja",
        email: "sreemanitejateja@gmail.com",
        emailVerified: true,
      });
      console.log("✓ Inserted default owner user into Neon DB");
    }

    // 2. Ensure Default Collections exist
    const existingColls = await db
      .select()
      .from(collections)
      .where(eq(collections.userId, DEFAULT_SINGLE_TENANT_USER_ID));

    if (existingColls.length === 0) {
      const collsToInsert = COLLS.flatMap((c) => {
        const parent = {
          id: c.id,
          userId: DEFAULT_SINGLE_TENANT_USER_ID,
          name: c.name,
          icon: c.ic,
          color: c.c,
          parentId: null as string | null,
        };
        const children = (c.kids || []).map((k) => ({
          id: k.id,
          userId: DEFAULT_SINGLE_TENANT_USER_ID,
          name: k.name,
          icon: k.ic,
          color: k.c,
          parentId: c.id,
        }));
        return [parent, ...children];
      });

      for (const item of collsToInsert) {
        await db.insert(collections).values(item).onConflictDoNothing();
      }
      console.log("✓ Seeded default collections into Neon DB");
    }

    // 3. Ensure Default Bookmarks exist
    const existingBookmarks = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.userId, DEFAULT_SINGLE_TENANT_USER_ID));

    if (existingBookmarks.length === 0) {
      for (const b of INITIAL_BOOKMARKS) {
        await db
          .insert(bookmarks)
          .values({
            userId: DEFAULT_SINGLE_TENANT_USER_ID,
            title: b.t,
            type: b.ty,
            source: b.src,
            url: b.url,
            mins: b.mins,
            tag: b.tag,
            collectionId: b.coll,
            unread: b.unread,
            note: b.note || "",
            extra: b.ex || {},
          })
          .onConflictDoNothing();
      }
      console.log("✓ Seeded initial bookmarks into Neon DB");
    }
  } catch (err) {
    console.error("Database seed error:", err);
  }
}

// Execute seed script if run directly
if (require.main === module) {
  seedDatabase().then(() => {
    console.log("✓ Database seeding complete.");
    process.exit(0);
  });
}
