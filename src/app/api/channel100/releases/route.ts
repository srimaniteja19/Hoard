import { NextResponse } from "next/server";
import { fetchWithSsrfGuard } from "@/lib/security/ssrfGuard";
import {
  formatIsoDate,
  getWeekDateStrings,
  parseTvMazeScheduleEntries,
  parseWikidataReleaseFilms,
  sortAndDedupeReleases,
} from "@/lib/channel100/releases";
import { ChannelMediaItem } from "@/lib/channel100/types";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface ReleasesCacheState {
  items: ChannelMediaItem[];
  syncedAt: number;
  sources: string[];
}

let cachedReleases: ReleasesCacheState | null = null;

async function fetchLiveReleases(): Promise<ReleasesCacheState> {
  const now = new Date();
  const todayStr = formatIsoDate(now);
  const weekDates = getWeekDateStrings(now);
  const currentYear = now.getFullYear();
  const sources: string[] = [];
  const collected: ChannelMediaItem[] = [];

  // 1. TVMaze Web Streaming Schedule for the week + US & India schedules for today
  const tvMazeUrls = [
    ...weekDates.map((d) => `https://api.tvmaze.com/schedule/web?date=${d}`),
    `https://api.tvmaze.com/schedule?country=US&date=${todayStr}`,
    `https://api.tvmaze.com/schedule?country=IN&date=${todayStr}`,
  ];

  const tvResults = await Promise.allSettled(
    tvMazeUrls.map((u) => fetchWithSsrfGuard(u))
  );

  const rawScheduleEntries: any[] = [];
  for (const r of tvResults) {
    if (r.status === "fulfilled" && r.value.ok && r.value.text.trim().startsWith("[")) {
      try {
        const arr = JSON.parse(r.value.text);
        if (Array.isArray(arr)) rawScheduleEntries.push(...arr);
      } catch {
        // Ignore malformed chunk
      }
    }
  }

  if (rawScheduleEntries.length > 0) {
    sources.push("tvmaze-web-schedule");
    collected.push(...parseTvMazeScheduleEntries(rawScheduleEntries, now));
  }

  // 2. Wikidata SPARQL for Hollywood (US) & Indian Feature Film releases this year
  try {
    const sparql = `
      SELECT ?film ?filmLabel ?pubDate ?imdbId (SAMPLE(?dirLabel) AS ?directorLabel) (SAMPLE(?cLabel) AS ?countryLabel) (SAMPLE(?gLabel) AS ?genreLabel) (SAMPLE(?dur) AS ?duration) WHERE {
        ?film wdt:P31 wd:Q11424;
              wdt:P577 ?pubDate;
              wdt:P495 ?country.
        FILTER(YEAR(?pubDate) = ${currentYear})
        FILTER(?country IN (wd:Q30, wd:Q668))
        ?country rdfs:label ?cLabel. FILTER(LANG(?cLabel) = "en")
        OPTIONAL { ?film wdt:P345 ?imdbId. }
        OPTIONAL { ?film wdt:P57 ?dir. ?dir rdfs:label ?dirLabel. FILTER(LANG(?dirLabel) = "en") }
        OPTIONAL { ?film wdt:P136 ?genre. ?genre rdfs:label ?gLabel. FILTER(LANG(?gLabel) = "en") }
        OPTIONAL { ?film wdt:P2047 ?dur. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      GROUP BY ?film ?filmLabel ?pubDate ?imdbId
      ORDER BY DESC(?pubDate)
      LIMIT 80
    `.trim();

    const wdUrl = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(
      sparql
    )}`;
    const wdRes = await fetchWithSsrfGuard(wdUrl);
    if (wdRes.ok && wdRes.text.trim().startsWith("{")) {
      const wdJson = JSON.parse(wdRes.text);
      const filmReleases = parseWikidataReleaseFilms(wdJson, now);
      if (filmReleases.length > 0) {
        sources.push("wikidata-film-releases");
        collected.push(...filmReleases);
      }
    }
  } catch {
    // Graceful fallback if Wikidata times out
  }

  const items = sortAndDedupeReleases(collected);
  return {
    items,
    syncedAt: Date.now(),
    sources,
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1";
    const now = Date.now();

    if (!force && cachedReleases && now - cachedReleases.syncedAt < CACHE_TTL_MS) {
      return NextResponse.json({
        ...cachedReleases,
        cached: true,
      });
    }

    const fresh = await fetchLiveReleases();
    cachedReleases = fresh;
    return NextResponse.json({
      ...fresh,
      cached: false,
    });
  } catch (error) {
    console.error("[GET /api/channel100/releases]", error);
    return NextResponse.json({
      items: [],
      syncedAt: Date.now(),
      sources: [],
      cached: false,
    });
  }
}

