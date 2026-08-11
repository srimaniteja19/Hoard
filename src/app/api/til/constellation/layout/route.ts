import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { tilEntries, constellationLayouts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { computeConstellationCacheKey } from "@/lib/til/constellationCacheKey";

// ─── POST /api/til/constellation/layout ──────────────────────────────────
//
// Persists a just-settled d3-force layout (SPECTACLE.md §3, Phase 10) so the
// next unscoped GET /api/til/constellation can render instantly instead of
// re-running the simulation. The cache key is recomputed from the live DB
// state here, never trusted from the client — a stale or forged key could
// only ever cause an extra simulation, never serve wrong positions.

const positionsSchema = z.record(z.string(), z.object({ x: z.number(), y: z.number() }));

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();
    const positions = positionsSchema.parse(body.positions);

    const rows = await db
      .select({ updatedAt: tilEntries.updatedAt })
      .from(tilEntries)
      .where(eq(tilEntries.userId, userId));
    const maxUpdatedAt = rows.reduce<Date | null>(
      (max, r) => (max === null || r.updatedAt > max ? r.updatedAt : max),
      null
    );
    const cacheKey = computeConstellationCacheKey(userId, rows.length, maxUpdatedAt?.toISOString() ?? null);

    await db
      .insert(constellationLayouts)
      .values({ userId, cacheKey, positions, computedAt: new Date() })
      .onConflictDoUpdate({
        target: constellationLayouts.userId,
        set: { cacheKey, positions, computedAt: new Date() },
      });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid positions" }, { status: 400 });
    }
    console.error("[POST /api/til/constellation/layout]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
