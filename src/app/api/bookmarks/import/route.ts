import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks, collections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { KindType } from "@/types";
import { cleanTitle } from "@/lib/cleanTitle";
import { detectKind } from "@/lib/detectKind";

interface ImportBookmarkPayload {
  t?: string;
  title?: string;
  url: string;
  ty?: KindType;
  type?: KindType;
  src?: string;
  mins?: number;
  tag?: string;
  coll?: string;
  folder?: string;
  unread?: boolean;
  note?: string;
  ex?: Record<string, string>;
}

function extractDomain(u: string): string {
  try {
    const parsed = new URL(u.startsWith("http") ? u : `https://${u}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const items: ImportBookmarkPayload[] = Array.isArray(body) ? body : body.items || [];

    if (items.length === 0) {
      return NextResponse.json({ error: "No items provided for import" }, { status: 400 });
    }

    // Cache user's collections mapping
    const existingColls = await db
      .select({ id: collections.id, name: collections.name })
      .from(collections)
      .where(eq(collections.userId, userId));

    const collMap = new Map<string, string>();
    existingColls.forEach((c) => {
      collMap.set(c.id, c.id);
      collMap.set(c.name.toLowerCase(), c.id);
    });

    const defaultCollId = `${userId.slice(-8)}-unsorted`;
    if (!collMap.has(defaultCollId)) {
      await db.insert(collections).values({
        id: defaultCollId,
        userId,
        name: "Unsorted",
        icon: "📁",
        color: "#00F0FF",
      }).onConflictDoNothing();
      collMap.set("unsorted", defaultCollId);
      collMap.set(defaultCollId, defaultCollId);
    }

    // Process items in batches of 50
    const toInsert = [];
    for (const item of items) {
      if (!item.url || !item.url.trim()) continue;
      const rawUrl = item.url.trim();
      const validUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
      const title = cleanTitle(item.t || item.title, validUrl);
      const type = item.ty || item.type || detectKind(validUrl);
      const source = item.src || extractDomain(validUrl);

      // Handle folder / collection target
      let targetCollId = defaultCollId;
      const rawFolder = item.coll || item.folder;
      if (rawFolder) {
        const lower = rawFolder.toLowerCase().trim();
        if (collMap.has(lower)) {
          targetCollId = collMap.get(lower)!;
        } else {
          // Auto create folder for imported bookmark
          const slug = lower.replace(/[^a-z0-9]+/g, "-");
          const newCollId = `${userId.slice(-8)}-${slug}`;
          await db.insert(collections).values({
            id: newCollId,
            userId,
            name: rawFolder,
            icon: "📁",
            color: "#FFE600",
          }).onConflictDoNothing();
          collMap.set(lower, newCollId);
          collMap.set(newCollId, newCollId);
          targetCollId = newCollId;
        }
      }

      toInsert.push({
        userId,
        title,
        type,
        source,
        url: validUrl,
        mins: item.mins ?? (type === "VID" ? 30 : type === "PPR" ? 30 : 10),
        tag: item.tag || "imported",
        collectionId: targetCollId,
        unread: item.unread ?? true,
        note: item.note || "Imported into HOARD",
        extra: item.ex || { Source: source },
      });
    }

    if (toInsert.length === 0) {
      return NextResponse.json({ error: "No valid bookmarks found to import" }, { status: 400 });
    }

    // Insert into DB. onConflictDoNothing on (userId, url): without it, a
    // single item that's already saved (or was saved and soft-deleted —
    // deletedAt doesn't exempt a row from the unique constraint) fails the
    // unique constraint for the whole batch, silently dropping every other
    // item in the import along with it.
    const inserted = await db
      .insert(bookmarks)
      .values(toInsert)
      .onConflictDoNothing({ target: [bookmarks.userId, bookmarks.url] })
      .returning({ id: bookmarks.id });

    const skipped = toInsert.length - inserted.length;

    return NextResponse.json({
      success: true,
      importedCount: inserted.length,
      skippedCount: skipped,
      message:
        skipped > 0
          ? `Imported ${inserted.length} bookmark(s), skipped ${skipped} already-saved URL(s).`
          : `Successfully imported ${inserted.length} bookmark(s).`,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/bookmarks/import]", e);
    return NextResponse.json({ error: "Failed to import bookmarks" }, { status: 500 });
  }
}
