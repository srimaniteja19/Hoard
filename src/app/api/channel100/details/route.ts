import { NextResponse } from "next/server";
import { fetchWithSsrfGuard } from "@/lib/security/ssrfGuard";

export interface EnrichedMediaDetails {
  fullDescription: string | null;
  cast: string[];
  creatorOrDirector: string | null;
  country: string | null;
  source: string;
}

const DETAILS_CACHE = new Map<string, { data: EnrichedMediaDetails; ts: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function stripTags(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#8217;|&#039;|&rsquo;/gi, "’")
    .replace(/&#8220;|&ldquo;/gi, "“")
    .replace(/&#8221;|&rdquo;/gi, "”")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchTvMazeDetails(title: string): Promise<Partial<EnrichedMediaDetails> | null> {
  try {
    const cleanQ = title.replace(/\s*\([^)]*\)\s*/g, "").trim();
    const url = `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(cleanQ)}&embed=cast`;
    const res = await fetchWithSsrfGuard(url);
    if (!res.ok || !res.text.trim().startsWith("{")) return null;
    const data = JSON.parse(res.text);
    const summary = data.summary ? stripTags(String(data.summary)) : null;
    const castList: any[] = data._embedded?.cast || [];
    const cast = Array.from(
      new Set(
        castList
          .slice(0, 8)
          .map((c) => {
            const actor = c?.person?.name;
            const role = c?.character?.name;
            return actor ? (role ? `${actor} (${role})` : actor) : null;
          })
          .filter((x): x is string => Boolean(x))
      )
    );
    const country = data.network?.country?.name || data.webChannel?.country?.name || null;
    return {
      fullDescription: summary,
      cast,
      country,
      source: "tvmaze",
    };
  } catch {
    return null;
  }
}

async function fetchItunesMovieDetails(
  title: string,
  year?: string | null
): Promise<Partial<EnrichedMediaDetails> | null> {
  try {
    const cleanQ = title.replace(/\s*\([^)]*\)\s*/g, "").trim();
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&media=movie&entity=movie&limit=5`;
    const res = await fetchWithSsrfGuard(url);
    if (!res.ok || !res.text.trim().startsWith("{")) return null;
    const json = JSON.parse(res.text);
    const results: any[] = json.results || [];
    if (!results.length) return null;

    const targetYear = year ? parseInt(year, 10) : null;
    const matched =
      results.find((r) => {
        const nameMatch =
          String(r.trackName || "").toLowerCase().includes(cleanQ.toLowerCase());
        const yrMatch =
          !targetYear ||
          (r.releaseDate && String(r.releaseDate).startsWith(String(targetYear)));
        return nameMatch && yrMatch;
      }) || results[0];

    const desc = matched?.longDescription
      ? stripTags(String(matched.longDescription))
      : null;

    return {
      fullDescription: desc,
      creatorOrDirector: matched?.artistName ? String(matched.artistName) : null,
      country: matched?.country ? String(matched.country) : null,
      source: "itunes",
    };
  } catch {
    return null;
  }
}

async function fetchWikipediaSummary(
  title: string,
  kind: string,
  year?: string | null
): Promise<Partial<EnrichedMediaDetails> | null> {
  const cleanTitle = title.replace(/\s*\([^)]*\)\s*/g, "").trim();
  const candidates = [
    `${cleanTitle} (${kind === "tv" ? "TV series" : "film"})`,
    year ? `${cleanTitle} (${year} ${kind === "tv" ? "TV series" : "film"})` : "",
    cleanTitle,
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        candidate.replace(/\s+/g, "_")
      )}`;
      const res = await fetchWithSsrfGuard(url);
      if (!res.ok || !res.text.trim().startsWith("{")) continue;
      const data = JSON.parse(res.text);
      if (data.type === "disambiguation" || !data.extract) continue;

      const extract = stripTags(String(data.extract));
      if (extract.length < 60) continue;

      return {
        fullDescription: extract,
        source: "wikipedia",
      };
    } catch {
      // Try next candidate
    }
  }
  return null;
}

async function fetchWikidataCastAndCreator(
  title: string,
  imdbId?: string | null
): Promise<Partial<EnrichedMediaDetails> | null> {
  try {
    const cleanTitle = title.replace(/\s*\([^)]*\)\s*/g, "").replace(/"/g, '\\"').trim();
    const filterClause = imdbId
      ? `?item wdt:P345 "${imdbId}".`
      : `?item rdfs:label "${cleanTitle}"@en; wdt:P31/wdt:P279* wd:Q11424.`;

    const sparql = `
      SELECT ?actorLabel ?directorLabel ?countryLabel WHERE {
        ${filterClause}
        OPTIONAL { ?item wdt:P161 ?actor. ?actor rdfs:label ?actorLabel. FILTER(LANG(?actorLabel) = "en") }
        OPTIONAL { ?item wdt:P57 ?director. ?director rdfs:label ?directorLabel. FILTER(LANG(?directorLabel) = "en") }
        OPTIONAL { ?item wdt:P170 ?creator. ?creator rdfs:label ?directorLabel. FILTER(LANG(?directorLabel) = "en") }
        OPTIONAL { ?item wdt:P495 ?country. ?country rdfs:label ?countryLabel. FILTER(LANG(?countryLabel) = "en") }
      }
      LIMIT 12
    `.trim();

    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(
      sparql
    )}`;
    const res = await fetchWithSsrfGuard(url);
    if (!res.ok || !res.text.trim().startsWith("{")) return null;
    const json = JSON.parse(res.text);
    const bindings: any[] = json?.results?.bindings || [];
    if (!bindings.length) return null;

    const cast = Array.from(
      new Set(
        bindings
          .map((b) => b.actorLabel?.value)
          .filter((v): v is string => Boolean(v && !/^Q\d+$/.test(v)))
      )
    ).slice(0, 8);

    const creatorOrDirector =
      bindings.find((b) => b.directorLabel?.value)?.directorLabel?.value || null;
    const country =
      bindings.find((b) => b.countryLabel?.value)?.countryLabel?.value || null;

    return { cast, creatorOrDirector, country };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const title = url.searchParams.get("title")?.trim() || "";
  const year = url.searchParams.get("year");
  const kind = url.searchParams.get("kind") || "film";
  const imdbId = url.searchParams.get("imdbId");

  if (!title) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  const cacheKey = `${kind}_${title.toLowerCase()}_${year || ""}`;
  const cached = DETAILS_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  const [tvMaze, itunes, wiki, wd] = await Promise.all([
    kind === "tv" ? fetchTvMazeDetails(title) : Promise.resolve(null),
    kind !== "tv" ? fetchItunesMovieDetails(title, year) : Promise.resolve(null),
    fetchWikipediaSummary(title, kind, year),
    fetchWikidataCastAndCreator(title, imdbId),
  ]);

  const descriptions = [
    wiki?.fullDescription,
    itunes?.fullDescription,
    tvMaze?.fullDescription,
  ].filter((d): d is string => Boolean(d && d.length > 0));

  // Prefer the longest, richest description
  descriptions.sort((a, b) => b.length - a.length);

  const cast =
    (tvMaze?.cast && tvMaze.cast.length > 0 ? tvMaze.cast : null) ||
    (wd?.cast && wd.cast.length > 0 ? wd.cast : []);

  const result: EnrichedMediaDetails = {
    fullDescription: descriptions[0] || null,
    cast,
    creatorOrDirector:
      wd?.creatorOrDirector || itunes?.creatorOrDirector || null,
    country: wd?.country || tvMaze?.country || itunes?.country || null,
    source: wiki?.source || tvMaze?.source || itunes?.source || "catalog",
  };

  DETAILS_CACHE.set(cacheKey, { data: result, ts: Date.now() });
  return NextResponse.json(result);
}

