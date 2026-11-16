import { NextResponse } from "next/server";
import { fetchWithSsrfGuard } from "@/lib/security/ssrfGuard";
import {
  mergeCatalogItems,
  parseImdbChartHtml,
  parseLetterboxdListHtml,
  parseTvMazeShows,
  parseWikidataFilmsJson,
} from "@/lib/channel100/liveCatalogs";
import {
  VERIFIED_IMDB_TV_CATALOG,
  VERIFIED_LETTERBOXD_FILM_CATALOG,
} from "@/lib/channel100/curatedCanons";
import { ChannelMediaItem } from "@/lib/channel100/types";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface LiveCatalogsCache {
  tv: ChannelMediaItem[];
  film: ChannelMediaItem[];
  syncedAt: number;
  sources: {
    tv: string;
    film: string;
  };
}

let cachedCatalogs: LiveCatalogsCache | null = null;

async function fetchLiveImdbTop250Tv(): Promise<{
  items: ChannelMediaItem[];
  source: string;
}> {
  const sourcesUsed: string[] = [];
  let imdbItems: ChannelMediaItem[] = [];
  let tvMazeItems: ChannelMediaItem[] = [];

  // 1. Live IMDb Top 250 TV Chart
  try {
    const imdbRes = await fetchWithSsrfGuard("https://www.imdb.com/chart/toptv/");
    if (imdbRes.ok && imdbRes.text) {
      imdbItems = parseImdbChartHtml(imdbRes.text, "tv");
      if (imdbItems.length > 0) {
        sourcesUsed.push("imdb-toptv-live");
      }
    }
  } catch {
    // Fallback to TVMaze
  }

  // 2. If IMDb returned fewer than 250 (or WAF-blocked), supplement from TVMaze public API
  if (imdbItems.length < 250) {
    try {
      const pages = await Promise.allSettled([
        fetchWithSsrfGuard("https://api.tvmaze.com/shows?page=0"),
        fetchWithSsrfGuard("https://api.tvmaze.com/shows?page=1"),
        fetchWithSsrfGuard("https://api.tvmaze.com/shows?page=2"),
      ]);
      const rawShows: any[] = [];
      for (const p of pages) {
        if (p.status === "fulfilled" && p.value.ok && p.value.text.startsWith("[")) {
          const parsed = JSON.parse(p.value.text);
          if (Array.isArray(parsed)) rawShows.push(...parsed);
        }
      }
      if (rawShows.length > 0) {
        tvMazeItems = parseTvMazeShows(rawShows, 250);
        if (tvMazeItems.length > 0) {
          sourcesUsed.push("tvmaze-top-rated-live");
        }
      }
    } catch {
      // Fallback
    }
  }

  const merged = mergeCatalogItems(
    [imdbItems, VERIFIED_IMDB_TV_CATALOG, tvMazeItems],
    250
  );
  return {
    items: merged,
    source: sourcesUsed.join("+") || "baseline",
  };
}

const WIKIDATA_LB500_SPARQL = `
SELECT ?film ?filmLabel ?lbId ?imdbId (MIN(YEAR(?pub)) AS ?year) (SAMPLE(?dirLabel) AS ?directorLabel) (SAMPLE(?cLabel) AS ?countryLabel) (SAMPLE(?gLabel) AS ?genreLabel) (SAMPLE(?dur) AS ?duration) WHERE {
  ?film wdt:P31 wd:Q11424;
        wdt:P6127 ?lbId;
        wdt:P345 ?imdbId;
        wdt:P577 ?pub;
        wdt:P166 ?award.
  OPTIONAL { ?film wdt:P57 ?dir. ?dir rdfs:label ?dirLabel. FILTER(LANG(?dirLabel) = "en") }
  OPTIONAL { ?film wdt:P495 ?country. ?country rdfs:label ?cLabel. FILTER(LANG(?cLabel) = "en") }
  OPTIONAL { ?film wdt:P136 ?genre. ?genre rdfs:label ?gLabel. FILTER(LANG(?gLabel) = "en") }
  OPTIONAL { ?film wdt:P2047 ?dur. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
GROUP BY ?film ?filmLabel ?lbId ?imdbId
LIMIT 600
`.trim();

async function fetchLiveLetterboxd500Films(): Promise<{
  items: ChannelMediaItem[];
  source: string;
}> {
  const sourcesUsed: string[] = [];
  let lbItems: ChannelMediaItem[] = [];
  let imdbMovieItems: ChannelMediaItem[] = [];
  let wikidataItems: ChannelMediaItem[] = [];

  // 1. Try Letterboxd official Top 500 / Top 250 list pages
  try {
    const lbUrls = [
      "https://letterboxd.com/official/list/letterboxds-top-500-films/",
      "https://letterboxd.com/official/list/letterboxds-top-500-films/page/2/",
      "https://letterboxd.com/official/list/letterboxds-top-500-films/page/3/",
      "https://letterboxd.com/official/list/letterboxds-top-500-films/page/4/",
      "https://letterboxd.com/official/list/letterboxds-top-500-films/page/5/",
    ];
    const lbResponses = await Promise.allSettled(
      lbUrls.map((u) => fetchWithSsrfGuard(u))
    );
    const htmlPages = lbResponses
      .filter((r): r is PromiseFulfilledResult<{ ok: boolean; status: number; text: string; finalUrl: string }> => r.status === "fulfilled" && r.value.ok)
      .map((r) => r.value.text);
    if (htmlPages.length > 0) {
      lbItems = parseLetterboxdListHtml(htmlPages, 500);
      if (lbItems.length > 0) {
        sourcesUsed.push("letterboxd-live");
      }
    }
  } catch {
    // Continue
  }

  // 2. Live IMDb Top 250 Films
  if (lbItems.length < 500) {
    try {
      const imdbMoviesRes = await fetchWithSsrfGuard("https://www.imdb.com/chart/top/");
      if (imdbMoviesRes.ok && imdbMoviesRes.text) {
        imdbMovieItems = parseImdbChartHtml(imdbMoviesRes.text, "film");
        if (imdbMovieItems.length > 0) {
          sourcesUsed.push("imdb-top-movies-live");
        }
      }
    } catch {
      // Continue
    }
  }

  // 3. Live Wikidata SPARQL query for Letterboxd-indexed (P6127) acclaimed feature films to reach 500 real films
  if (lbItems.length + imdbMovieItems.length < 500) {
    try {
      const sparqlUrl = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(
        WIKIDATA_LB500_SPARQL
      )}`;
      const wdRes = await fetchWithSsrfGuard(sparqlUrl);
      if (wdRes.ok && wdRes.text.trim().startsWith("{")) {
        const wdJson = JSON.parse(wdRes.text);
        wikidataItems = parseWikidataFilmsJson(wdJson, 500);
        if (wikidataItems.length > 0) {
          sourcesUsed.push("wikidata-letterboxd-sparql-live");
        }
      }
    } catch {
      // Continue
    }
  }

  const merged = mergeCatalogItems(
    [lbItems, VERIFIED_LETTERBOXD_FILM_CATALOG, imdbMovieItems, wikidataItems],
    500
  );
  return {
    items: merged,
    source: sourcesUsed.join("+") || "baseline",
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1";
    const now = Date.now();

    if (!force && cachedCatalogs && now - cachedCatalogs.syncedAt < CACHE_TTL_MS) {
      return NextResponse.json({
        tv: cachedCatalogs.tv,
        film: cachedCatalogs.film,
        tvCount: cachedCatalogs.tv.length,
        filmCount: cachedCatalogs.film.length,
        syncedAt: cachedCatalogs.syncedAt,
        sources: cachedCatalogs.sources,
        cached: true,
      });
    }

    const [tvResult, filmResult] = await Promise.all([
      fetchLiveImdbTop250Tv(),
      fetchLiveLetterboxd500Films(),
    ]);

    cachedCatalogs = {
      tv: tvResult.items,
      film: filmResult.items,
      syncedAt: now,
      sources: {
        tv: tvResult.source,
        film: filmResult.source,
      },
    };

    return NextResponse.json({
      tv: cachedCatalogs.tv,
      film: cachedCatalogs.film,
      tvCount: cachedCatalogs.tv.length,
      filmCount: cachedCatalogs.film.length,
      syncedAt: cachedCatalogs.syncedAt,
      sources: cachedCatalogs.sources,
      cached: false,
    });
  } catch (error) {
    console.error("[GET /api/channel100/catalogs]", error);
    return NextResponse.json({
      tv: VERIFIED_IMDB_TV_CATALOG,
      film: VERIFIED_LETTERBOXD_FILM_CATALOG,
      tvCount: VERIFIED_IMDB_TV_CATALOG.length,
      filmCount: VERIFIED_LETTERBOXD_FILM_CATALOG.length,
      syncedAt: Date.now(),
      sources: { tv: "fallback", film: "fallback" },
      cached: false,
    });
  }
}

