import { NextResponse } from "next/server";
import { fetchWithSsrfGuard } from "@/lib/security/ssrfGuard";
import { FavoriteMediaType, FavoriteReview } from "@/lib/channel100/types";
import {
  buildLetterboxdUrl,
  formatWikidataGenre,
  parseWikipediaReceptionReviews,
} from "@/lib/channel100/reviewsParser";

export interface LookupCandidate {
  id: string; // imdbId e.g. tt2905768 or tvmaze_...
  imdbId?: string;
  title: string;
  mediaType: FavoriteMediaType;
  year?: string;
  stars?: string;
  image?: string;
}

export interface LookupEnrichedResult {
  title: string;
  mediaType: FavoriteMediaType;
  year?: string;
  creator?: string;
  genre?: string;
  lang?: string;
  where?: string;
  hours?: number;
  image?: string;
  imdbId?: string;
  synopsis?: string;
  letterboxdUrl: string;
  reviews: FavoriteReview[];
}

const ENRICH_CACHE = new Map<string, { data: LookupEnrichedResult; ts: number }>();
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

function optimizeImdbPoster(rawUrl?: string): string | undefined {
  if (!rawUrl || !rawUrl.startsWith("http")) return undefined;
  if (rawUrl.includes("media-amazon.com/images/") && rawUrl.includes("._V1_")) {
    return rawUrl.replace(/\._V1_.*?\.(jpg|jpeg|png|webp)$/i, "._V1_UX600_.$1");
  }
  return rawUrl;
}

async function searchImdbCandidates(
  query: string,
  preferredType?: FavoriteMediaType | null
): Promise<LookupCandidate[]> {
  try {
    const clean = query.trim();
    if (clean.length < 2) return [];
    const norm = clean
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const firstChar = norm.charAt(0);
    const bucket = firstChar && /[a-z0-9]/.test(firstChar) ? firstChar : "x";
    const slug = norm.slice(0, 40) || encodeURIComponent(clean);

    const url = `https://v3.sg.media-imdb.com/suggestion/${bucket}/${encodeURIComponent(slug)}.json`;
    const res = await fetchWithSsrfGuard(url);
    if (!res.ok || !res.text.trim().startsWith("{")) return [];
    const json = JSON.parse(res.text);
    const raw: any[] = Array.isArray(json?.d) ? json.d : [];

    const mapped: LookupCandidate[] = raw
      .filter((item) => typeof item?.id === "string" && item.id.startsWith("tt"))
      .map((item) => {
        const qid = String(item.qid || item.q || "").toLowerCase();
        const isShow =
          qid.includes("tvseries") ||
          qid.includes("tvminiseries") ||
          qid.includes("tv series") ||
          qid.includes("tv mini");
        return {
          id: item.id,
          imdbId: item.id,
          title: String(item.l || clean),
          mediaType: (isShow ? "show" : "movie") as FavoriteMediaType,
          year: item.yr ? String(item.yr) : item.y ? String(item.y) : undefined,
          stars: typeof item.s === "string" ? item.s : undefined,
          image: optimizeImdbPoster(item?.i?.imageUrl),
        };
      });

    if (preferredType) {
      mapped.sort((a, b) => {
        const aMatch = a.mediaType === preferredType ? 0 : 1;
        const bMatch = b.mediaType === preferredType ? 0 : 1;
        return aMatch - bMatch;
      });
    }

    return mapped.slice(0, 6);
  } catch {
    return [];
  }
}

async function fetchWikidataInfo(
  title: string,
  imdbId?: string | null,
  mediaType?: FavoriteMediaType
) {
  try {
    const safeTitle = title.replace(/"/g, '\\"').trim();
    const matchClause = imdbId
      ? `?item wdt:P345 "${imdbId.replace(/[^a-z0-9]/gi, "")}".`
      : `?item rdfs:label "${safeTitle}"@en; wdt:P31/wdt:P279* ${
          mediaType === "show" ? "wd:Q5398426" : "wd:Q11424"
        }.`;

    const sparql = `
      SELECT ?directorLabel ?creatorLabel ?genreLabel ?langLabel ?duration ?letterboxd WHERE {
        ${matchClause}
        OPTIONAL { ?item wdt:P57 ?director. }
        OPTIONAL { ?item wdt:P170 ?creator. }
        OPTIONAL { ?item wdt:P136 ?genre. }
        OPTIONAL { ?item wdt:P364 ?lang. }
        OPTIONAL { ?item wdt:P2047 ?duration. }
        OPTIONAL { ?item wdt:P6127 ?letterboxd. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      LIMIT 15
    `.trim();

    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`;
    const res = await fetchWithSsrfGuard(url);
    if (!res.ok || !res.text.trim().startsWith("{")) return null;
    const json = JSON.parse(res.text);
    const bindings: any[] = json?.results?.bindings || [];
    if (!bindings.length) return null;

    const cleanVal = (v?: string) => (v && !/^Q\d+$/.test(v) ? v : null);
    const director =
      bindings.map((b) => cleanVal(b.directorLabel?.value)).find(Boolean) ||
      bindings.map((b) => cleanVal(b.creatorLabel?.value)).find(Boolean) ||
      undefined;
    const genres = Array.from(
      new Set(
        bindings
          .map((b) => cleanVal(b.genreLabel?.value))
          .filter((x): x is string => Boolean(x))
      )
    );
    const lang = bindings.map((b) => cleanVal(b.langLabel?.value)).find(Boolean) || undefined;
    const durationMins = Number(bindings.find((b) => b.duration?.value)?.duration?.value);
    const letterboxdSlug =
      bindings.find((b) => b.letterboxd?.value)?.letterboxd?.value || undefined;

    return {
      creator: director,
      genre: formatWikidataGenre(genres) || undefined,
      lang,
      hours:
        Number.isFinite(durationMins) && durationMins > 20 && durationMins < 500
          ? Number((durationMins / 60).toFixed(1))
          : undefined,
      letterboxdSlug,
    };
  } catch {
    return null;
  }
}

async function fetchWikipediaDetailsAndReviews(
  title: string,
  mediaType: FavoriteMediaType,
  year?: string | null
): Promise<{
  synopsis?: string;
  reviews: FavoriteReview[];
  directorFallback?: string;
}> {
  try {
    const cleanTitle = title.replace(/\s*\([^)]*\)\s*/g, "").trim();
    const year4 = year?.match(/\d{4}/)?.[0] || "";
    const kindWord = mediaType === "show" ? "TV series" : "film";

    const searchQuery = [cleanTitle, year4, kindWord].filter(Boolean).join(" ");
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      searchQuery
    )}&srlimit=5&format=json`;
    const searchRes = await fetchWithSsrfGuard(searchUrl);
    if (!searchRes.ok || !searchRes.text.trim().startsWith("{")) {
      return { reviews: [] };
    }

    const searchJson = JSON.parse(searchRes.text);
    const hits: Array<{ title: string; snippet?: string }> =
      searchJson?.query?.search || [];
    if (!hits.length) return { reviews: [] };

    const normTitle = cleanTitle.toLowerCase();
    const chosen =
      hits.find((h) => {
        const lt = h.title.toLowerCase();
        return (
          lt === `${normTitle} (${year4} ${kindWord.toLowerCase()})` ||
          lt === `${normTitle} (${kindWord.toLowerCase()})`
        );
      }) ||
      hits.find((h) => {
        const lt = h.title.toLowerCase();
        return lt.includes(normTitle) && (lt.includes("film") || lt.includes("series"));
      }) ||
      hits.find((h) => h.title.toLowerCase().startsWith(normTitle)) ||
      hits[0];

    const pageTitle = chosen.title;

    // Fetch intro summary + section list in parallel
    const [summaryRes, sectionsRes] = await Promise.all([
      fetchWithSsrfGuard(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
          pageTitle.replace(/\s+/g, "_")
        )}`
      ),
      fetchWithSsrfGuard(
        `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(
          pageTitle
        )}&prop=sections&format=json`
      ),
    ]);

    let synopsis: string | undefined;
    let directorFallback: string | undefined;

    if (summaryRes.ok && summaryRes.text.trim().startsWith("{")) {
      const sumData = JSON.parse(summaryRes.text);
      if (sumData?.extract && sumData.type !== "disambiguation") {
        synopsis = String(sumData.extract).trim();
        const dirMatch = synopsis.match(
          /\b(?:directed|created)\s+by\s+([A-Z][A-Za-z.\-']+(?:\s+[A-Z][A-Za-z.\-']+){0,3})/
        );
        if (dirMatch?.[1]) {
          directorFallback = dirMatch[1].trim();
        }
      }
    }

    let reviews: FavoriteReview[] = [];
    if (sectionsRes.ok && sectionsRes.text.trim().startsWith("{")) {
      const secData = JSON.parse(sectionsRes.text);
      const sections: Array<{ line: string; index: string; toclevel: number }> =
        secData?.parse?.sections || [];

      // Prefer top-level "Reception" / "Critical reception" / "Critical response"
      const receptionSections = sections
        .filter((s) =>
          /^(critical\s+)?(reception|response|reviews)$/i.test(s.line.trim())
        )
        .sort((a, b) => a.toclevel - b.toclevel);

      const targetSection = receptionSections[0];
      if (targetSection?.index) {
        const htmlRes = await fetchWithSsrfGuard(
          `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(
            pageTitle
          )}&section=${encodeURIComponent(targetSection.index)}&prop=text&format=json`
        );
        if (htmlRes.ok && htmlRes.text.trim().startsWith("{")) {
          const htmlData = JSON.parse(htmlRes.text);
          const sectionHtml: string = htmlData?.parse?.text?.["*"] || "";
          reviews = parseWikipediaReceptionReviews(sectionHtml, 4);
        }
      }
    }

    return { synopsis, reviews, directorFallback };
  } catch {
    return { reviews: [] };
  }
}

async function fetchTvMazeMetadata(title: string) {
  try {
    const url = `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(title.trim())}`;
    const res = await fetchWithSsrfGuard(url);
    if (!res.ok || !res.text.trim().startsWith("{")) return null;
    const data = JSON.parse(res.text);
    const startYear = data.premiered ? String(data.premiered).slice(0, 4) : "";
    const endYear = data.ended ? String(data.ended).slice(0, 4) : "";
    const years =
      startYear && endYear && endYear !== startYear
        ? `${startYear}–${endYear}`
        : startYear || undefined;
    const where = data.webChannel?.name || data.network?.name || undefined;
    const genres: string[] = Array.isArray(data.genres) ? data.genres : [];
    return {
      year: years,
      creator: data.network?.name || data.webChannel?.name || undefined,
      where,
      genre: genres.slice(0, 3).join(", ") || undefined,
      lang: data.language || undefined,
      image: data.image?.original || data.image?.medium || undefined,
    };
  } catch {
    return null;
  }
}

async function fetchItunesMetadata(title: string, year?: string | null) {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      title.trim()
    )}&media=movie&entity=movie&limit=5`;
    const res = await fetchWithSsrfGuard(url);
    if (!res.ok || !res.text.trim().startsWith("{")) return null;
    const json = JSON.parse(res.text);
    const results: any[] = json?.results || [];
    if (!results.length) return null;
    const targetYr = year?.match(/\d{4}/)?.[0];
    const matched =
      results.find((r) => {
        const nameOk = String(r.trackName || "")
          .toLowerCase()
          .includes(title.trim().toLowerCase());
        const yrOk = !targetYr || String(r.releaseDate || "").startsWith(targetYr);
        return nameOk && yrOk;
      }) || results[0];

    return {
      creator: matched?.artistName ? String(matched.artistName) : undefined,
      genre: matched?.primaryGenreName ? String(matched.primaryGenreName) : undefined,
      year: matched?.releaseDate ? String(matched.releaseDate).slice(0, 4) : undefined,
      hours: matched?.trackTimeMillis
        ? Number((Number(matched.trackTimeMillis) / 3600000).toFixed(1))
        : undefined,
    };
  } catch {
    return null;
  }
}

async function fetchOptionalTmdbReviews(
  imdbId?: string | null,
  mediaType?: FavoriteMediaType
): Promise<FavoriteReview[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || !imdbId) return [];
  try {
    const findUrl = `https://api.themoviedb.org/3/find/${encodeURIComponent(
      imdbId
    )}?external_source=imdb_id&api_key=${encodeURIComponent(apiKey)}`;
    const findRes = await fetchWithSsrfGuard(findUrl);
    if (!findRes.ok || !findRes.text.trim().startsWith("{")) return [];
    const findJson = JSON.parse(findRes.text);
    const match =
      mediaType === "show"
        ? findJson?.tv_results?.[0]
        : findJson?.movie_results?.[0];
    if (!match?.id) return [];

    const kindPath = mediaType === "show" ? "tv" : "movie";
    const revUrl = `https://api.themoviedb.org/3/${kindPath}/${match.id}/reviews?api_key=${encodeURIComponent(
      apiKey
    )}`;
    const revRes = await fetchWithSsrfGuard(revUrl);
    if (!revRes.ok || !revRes.text.trim().startsWith("{")) return [];
    const revJson = JSON.parse(revRes.text);
    const raw: any[] = Array.isArray(revJson?.results) ? revJson.results : [];

    return raw
      .filter((r) => typeof r?.content === "string" && r.content.trim().length > 30)
      .slice(0, 4)
      .map((r) => {
        const ratingNum = r.author_details?.rating;
        const text = String(r.content).replace(/\s+/g, " ").trim();
        return {
          author: String(r.author || r.author_details?.username || "Viewer"),
          rating: typeof ratingNum === "number" ? `${ratingNum}/10` : undefined,
          text: text.length > 260 ? `${text.slice(0, 257).trimEnd()}…` : text,
          source: "tmdb" as const,
        };
      });
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const enrich = url.searchParams.get("enrich") === "1";

  // 1. Fast autocomplete search
  if (!enrich) {
    const q = url.searchParams.get("q")?.trim() || "";
    const typeParam = url.searchParams.get("type") as FavoriteMediaType | null;
    if (q.length < 2) {
      return NextResponse.json({ candidates: [] });
    }
    const candidates = await searchImdbCandidates(q, typeParam);
    return NextResponse.json({ candidates });
  }

  // 2. Full enrichment + reviews
  const title = url.searchParams.get("title")?.trim() || "";
  const year = url.searchParams.get("year")?.trim() || undefined;
  const imdbIdParam = url.searchParams.get("imdbId")?.trim() || undefined;
  const imageParam = url.searchParams.get("image")?.trim() || undefined;
  let mediaType: FavoriteMediaType =
    url.searchParams.get("type") === "show" ? "show" : "movie";

  if (!title) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  const cacheKey = `${mediaType}:${title.toLowerCase()}:${year || ""}:${imdbIdParam || ""}`;
  const cached = ENRICH_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  // Resolve IMDb candidate if imdbId wasn't passed (e.g. user clicked Auto-Fill directly)
  let resolvedImdbId = imdbIdParam;
  let resolvedYear = year;
  let resolvedImage = imageParam;
  let resolvedTitle = title;

  if (!resolvedImdbId) {
    const matches = await searchImdbCandidates(title, mediaType);
    const top = matches[0];
    if (top) {
      resolvedImdbId = top.imdbId;
      resolvedTitle = top.title || title;
      resolvedYear = resolvedYear || top.year;
      resolvedImage = resolvedImage || top.image;
      mediaType = top.mediaType;
    }
  }

  const [wd, wiki, tvMeta, itunesMeta, tmdbReviews] = await Promise.all([
    fetchWikidataInfo(resolvedTitle, resolvedImdbId, mediaType),
    fetchWikipediaDetailsAndReviews(resolvedTitle, mediaType, resolvedYear),
    mediaType === "show" ? fetchTvMazeMetadata(resolvedTitle) : Promise.resolve(null),
    mediaType === "movie"
      ? fetchItunesMetadata(resolvedTitle, resolvedYear)
      : Promise.resolve(null),
    fetchOptionalTmdbReviews(resolvedImdbId, mediaType),
  ]);

  const combinedReviews: FavoriteReview[] = [...tmdbReviews, ...wiki.reviews].slice(0, 4);

  const result: LookupEnrichedResult = {
    title: resolvedTitle,
    mediaType,
    year: resolvedYear || tvMeta?.year || itunesMeta?.year,
    creator:
      wd?.creator ||
      wiki.directorFallback ||
      itunesMeta?.creator ||
      tvMeta?.creator,
    genre: wd?.genre || tvMeta?.genre || itunesMeta?.genre,
    lang: wd?.lang || tvMeta?.lang,
    where: tvMeta?.where,
    hours: wd?.hours || itunesMeta?.hours,
    image: resolvedImage || tvMeta?.image,
    imdbId: resolvedImdbId,
    synopsis: wiki.synopsis,
    letterboxdUrl: buildLetterboxdUrl(resolvedTitle, wd?.letterboxdSlug),
    reviews: combinedReviews,
  };

  ENRICH_CACHE.set(cacheKey, { data: result, ts: Date.now() });
  return NextResponse.json(result);
}
