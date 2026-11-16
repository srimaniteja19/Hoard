import { NextResponse } from "next/server";
import { fetchWithSsrfGuard } from "@/lib/security/ssrfGuard";
import {
  buildVeryGoodFilmsCatalog,
  parseVeryGoodFilmsHtml,
  parseVeryGoodFilmsWpJson,
  RawVgfEntry,
} from "@/lib/channel100/verygoodfilms";
import { ChannelMediaItem } from "@/lib/channel100/types";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface VgfCacheState {
  items: ChannelMediaItem[];
  liveCount: number;
  syncedAt: number;
  source: "live" | "seed-fallback";
}

let cachedVgf: VgfCacheState | null = null;

async function fetchLiveVeryGoodFilms(): Promise<{
  entries: RawVgfEntry[];
  liveReachable: boolean;
}> {
  const collected: RawVgfEntry[] = [];
  let liveReachable = false;

  // 1. Try WordPress REST API endpoints (custom post types or posts)
  const wpEndpoints = [
    "https://verygoodfilms.co/wp-json/wp/v2/films?per_page=100",
    "https://verygoodfilms.co/wp-json/wp/v2/film?per_page=100",
    "https://verygoodfilms.co/wp-json/wp/v2/posts?per_page=100",
  ];

  for (const endpoint of wpEndpoints) {
    try {
      const res = await fetchWithSsrfGuard(endpoint);
      if (res.ok && res.text.trim().startsWith("[")) {
        liveReachable = true;
        const json = JSON.parse(res.text);
        const parsed = parseVeryGoodFilmsWpJson(json);
        if (parsed.length > 0) {
          collected.push(...parsed);
          break;
        }
      }
    } catch {
      // Continue to next endpoint or HTML fallback
    }
  }

  // 2. Try parsing the main catalogue HTML page directly
  try {
    const htmlRes = await fetchWithSsrfGuard("https://verygoodfilms.co/");
    if (htmlRes.ok && htmlRes.text) {
      liveReachable = true;
      const htmlParsed = parseVeryGoodFilmsHtml(htmlRes.text);
      if (htmlParsed.length > 0) {
        collected.push(...htmlParsed);
      }
    }
  } catch {
    // Fallback to curated seed + any WP REST entries collected
  }

  return { entries: collected, liveReachable };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1";
    const now = Date.now();

    if (!force && cachedVgf && now - cachedVgf.syncedAt < CACHE_TTL_MS) {
      return NextResponse.json({
        items: cachedVgf.items,
        liveCount: cachedVgf.liveCount,
        totalCount: cachedVgf.items.length,
        syncedAt: cachedVgf.syncedAt,
        source: "cached",
      });
    }

    const { entries, liveReachable } = await fetchLiveVeryGoodFilms();
    const items = buildVeryGoodFilmsCatalog(entries);
    const state: VgfCacheState = {
      items,
      liveCount: entries.length,
      syncedAt: now,
      source: liveReachable ? "live" : "seed-fallback",
    };
    cachedVgf = state;

    return NextResponse.json({
      items: state.items,
      liveCount: state.liveCount,
      totalCount: state.items.length,
      syncedAt: state.syncedAt,
      source: state.source,
    });
  } catch (error) {
    console.error("[GET /api/channel100/verygoodfilms]", error);
    const fallbackItems = buildVeryGoodFilmsCatalog();
    return NextResponse.json({
      items: fallbackItems,
      liveCount: 0,
      totalCount: fallbackItems.length,
      syncedAt: Date.now(),
      source: "seed-fallback",
    });
  }
}

