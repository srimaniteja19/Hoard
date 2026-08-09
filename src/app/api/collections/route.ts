import { NextResponse } from "next/server";
import { db } from "@/db";
import { collections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { Collection } from "@/types";

// User-scoped collection ID: avoids PK collision between users
function ucid(userId: string, slug: string): string {
  return `${userId.slice(-8)}-${slug}`;
}

const DEFAULT_COLLS = [
  { slug: "unsorted", name: "Unsorted",       icon: "📁", color: "#00F0FF" },
  { slug: "read",     name: "Read queue",      icon: "📚", color: "#FF007A" },
  { slug: "listen",   name: "Listen shelf",    icon: "🎧", color: "#7C4DFF" },
  { slug: "build",    name: "Build shelf",     icon: "🚀", color: "#B6FF3C" },
  { slug: "ai",       name: "AI & retrieval",  icon: "⚡", color: "#FFE600" },
  { slug: "systems",  name: "Data & storage",  icon: "⚙",  color: "#00E58A" },
];

/** Seed default collections for a new user, return them. */
async function seedDefaults(userId: string) {
  const rows = DEFAULT_COLLS.map((c) => ({
    id: ucid(userId, c.slug),
    userId,
    name: c.name,
    icon: c.icon,
    color: c.color,
    parentId: null,
  }));
  await db.insert(collections).values(rows).onConflictDoNothing();
}

/** Build nested Collection tree from flat rows. */
function buildTree(rows: (typeof collections.$inferSelect)[]): Collection[] {
  const map = new Map<string, Collection>();
  rows.forEach((r) =>
    map.set(r.id, { id: r.id, name: r.name, ic: r.icon, c: r.color, query: r.query || null, kids: [] })
  );

  const roots: Collection[] = [];
  rows.forEach((r) => {
    const node = map.get(r.id)!;
    if (r.parentId && map.has(r.parentId)) {
      map.get(r.parentId)!.kids!.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export async function GET() {
  try {
    const userId = await requireUserId();
    let rows = await db
      .select()
      .from(collections)
      .where(eq(collections.userId, userId));

    if (rows.length === 0) {
      await seedDefaults(userId);
      rows = await db
        .select()
        .from(collections)
        .where(eq(collections.userId, userId));
    }

    return NextResponse.json(buildTree(rows));
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[GET /api/collections]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { name, ic, c, parentId, query } = await req.json();

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const baseId = slug || `folder-${Date.now()}`;
    const id =
      parentId && parentId !== "root"
        ? `${parentId}-${baseId}`
        : ucid(userId, baseId);

    await db.insert(collections).values({
      id,
      userId,
      name,
      icon: ic || (query ? "⚡" : "📁"),
      color: c || "#00F0FF",
      parentId: parentId && parentId !== "root" ? parentId : null,
      query: query || null,
    });

    return NextResponse.json(
      { id, name, ic: ic || (query ? "⚡" : "📁"), c: c || "#00F0FF", query: query || null, kids: [] },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[POST /api/collections]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
