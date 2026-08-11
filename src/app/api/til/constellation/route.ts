import { NextResponse } from "next/server";
import { db } from "@/db";
import { tilEntries, constellationLayouts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { getTagsForTilEntries } from "@/lib/dal/til";
import { confidence } from "@/lib/til/confidence";
import { computeConstellationCacheKey } from "@/lib/til/constellationCacheKey";
import {
  buildConstellationGraph,
  collapseToHubs,
  extractHubNeighborhood,
  CONSTELLATION_TIER_3_THRESHOLD,
  ConstellationEntryInput,
} from "@/lib/til/constellationLayout";

// ─── GET /api/til/constellation[?hub=<tag>] ──────────────────────────────────
//
// Nodes/edges for the Constellation graph (SPECTACLE.md §3). Two queries: all
// of the user's entries, then their tags in one batch (no N+1) — the same
// pattern already proven in the CODEX route.
//
// Tier 3: above CONSTELLATION_TIER_3_THRESHOLD total nodes, the unscoped
// request returns hub summaries only (no satellites, no edges) — expanding a
// hub via ?hub=<tag> then loads just that neighborhood, never the full graph.

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);
    const hubTag = searchParams.get("hub");

    const rows = await db.select().from(tilEntries).where(eq(tilEntries.userId, userId));
    const tilIds = rows.map((r) => r.id);
    const tagMap = await getTagsForTilEntries(tilIds);

    const entries: ConstellationEntryInput[] = rows.map((r) => {
      const stability = r.stability ?? 1;
      const lastReviewedAtDate = r.lastReviewedAt ?? r.createdAt;
      return {
        id: r.id,
        type: r.type,
        body: r.body,
        shortHash: r.shortHash,
        confidence: confidence(stability, lastReviewedAtDate),
        supersededById: r.supersededById,
        tags: tagMap.get(r.id) || [],
      };
    });

    const graph = buildConstellationGraph(entries);

    if (hubTag) {
      const neighborhood = extractHubNeighborhood(graph, hubTag);
      return NextResponse.json(
        { tier: "neighborhood", nodes: neighborhood.nodes, edges: neighborhood.edges },
        { headers: { "Cache-Control": "private, max-age=300" } }
      );
    }

    // Layout cache (SPECTACLE.md §3, Phase 10): only for the unscoped default
    // graph — hub neighborhoods are cheap enough to simulate fresh every time.
    const maxUpdatedAt = rows.reduce<Date | null>(
      (max, r) => (max === null || r.updatedAt > max ? r.updatedAt : max),
      null
    );
    const cacheKey = computeConstellationCacheKey(userId, rows.length, maxUpdatedAt?.toISOString() ?? null);
    const [cachedLayout] = await db
      .select()
      .from(constellationLayouts)
      .where(eq(constellationLayouts.userId, userId));
    const cached = cachedLayout?.cacheKey === cacheKey;
    const positions = cached ? cachedLayout.positions : undefined;

    // No Cache-Control caching on these two branches: the whole point of the
    // `cached`/`positions` fields is to tell the client, on every request,
    // whether the layout cache is still valid right now. A browser-level
    // max-age would shadow that with a stale answer for up to 5 minutes,
    // defeating the layout cache it's supposed to speed up.
    if (graph.nodes.length > CONSTELLATION_TIER_3_THRESHOLD) {
      const hubs = collapseToHubs(graph);
      return NextResponse.json(
        { tier: "hubs-only", nodes: hubs, edges: [], cacheKey, cached, positions },
        { headers: { "Cache-Control": "private, no-cache" } }
      );
    }

    return NextResponse.json(
      { tier: "full", nodes: graph.nodes, edges: graph.edges, cacheKey, cached, positions },
      { headers: { "Cache-Control": "private, no-cache" } }
    );
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/til/constellation]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
