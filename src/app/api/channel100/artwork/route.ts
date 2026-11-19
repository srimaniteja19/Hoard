import { NextResponse } from "next/server";
import { fetchWithSsrfGuard } from "@/lib/security/ssrfGuard";

const ARTWORK_CACHE = new Map<string, { image: string | null; ts: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for hits
const MISS_TTL_MS = 5 * 60 * 1000; // 5 minutes for misses

function cleanTitle(raw: string): string {
  return raw.replace(/\s*\([^)]*\)\s*/g, "").trim();
}

function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function optimizeImdbImageUrl(rawUrl: string): string {
  // Resize huge raw IMDb/Amazon posters to 600px wide for fast card loading
  if (rawUrl.includes("media-amazon.com/images/") && rawUrl.includes("._V1_")) {
    return rawUrl.replace(/\._V1_.*?\.(jpg|jpeg|png|webp)$/i, "._V1_UX600_.$1");
  }
  return rawUrl;
}

async function fetchImdbSuggestionImage(
  title: string,
  kind: string,
  year?: string | null
): Promise<string | null> {
  try {
    const q = cleanTitle(title);
    if (!q) return null;
    const normQ = normalizeText(q);
    const firstChar = normQ.charAt(0);
    const bucket = firstChar && /[a-z0-9]/.test(firstChar) ? firstChar : "x";
    const slug = normQ.replace(/\s+/g, "_").slice(0, 40) || encodeURIComponent(q);

    const urls = [
      `https://v3.sg.media-imdb.com/suggestion/${bucket}/${encodeURIComponent(slug)}.json`,
      `https://v3.sg.media-imdb.com/suggestion/x/${encodeURIComponent(q)}.json`,
    ];

    let items: any[] = [];
    for (const url of urls) {
      const res = await fetchWithSsrfGuard(url);
      if (!res.ok || !res.text.trim().startsWith("{")) continue;
      const json = JSON.parse(res.text);
      const parsed: any[] = Array.isArray(json?.d) ? json.d : [];
      if (parsed.length > 0) {
        items = parsed;
        break;
      }
    }

    const withImage = items.filter(
      (item) =>
        typeof item?.i?.imageUrl === "string" &&
        item.i.imageUrl.startsWith("http") &&
        typeof item?.id === "string" &&
        item.id.startsWith("tt")
    );
    if (!withImage.length) return null;

    const targetYear = year ? parseInt(year, 10) : null;
    const isTv = kind === "tv";

    let bestItem: any = null;
    let bestScore = -1;

    for (const item of withImage) {
      let score = 0;
      const itemTitle = normalizeText(String(item.l || ""));
      if (itemTitle === normQ) score += 50;
      else if (itemTitle.includes(normQ) || normQ.includes(itemTitle)) score += 25;

      const qid = String(item.qid || "").toLowerCase();
      if (isTv && (qid === "tvseries" || qid === "tvminiseries")) score += 20;
      if (!isTv && (qid === "movie" || qid === "tvmovie" || qid === "short")) score += 20;

      if (targetYear && typeof item.y === "number") {
        const diff = Math.abs(item.y - targetYear);
        if (diff === 0) score += 35;
        else if (diff === 1) score += 20;
        else if (diff <= 3) score += 5;
      }

      if (score > bestScore) {
        bestScore = score;
        bestItem = item;
      }
    }

    const chosen = bestScore >= 20 ? bestItem : withImage[0];
    const imgUrl = chosen?.i?.imageUrl;
    return typeof imgUrl === "string" ? optimizeImdbImageUrl(imgUrl) : null;
  } catch {
    return null;
  }
}

async function fetchTvMazeImage(title: string): Promise<string | null> {
  try {
    const q = cleanTitle(title);
    const url = `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(q)}`;
    const res = await fetchWithSsrfGuard(url);
    if (!res.ok || !res.text.trim().startsWith("{")) return null;
    const data = JSON.parse(res.text);
    const img = data?.image?.medium || data?.image?.original || null;
    return typeof img === "string" && img.startsWith("http") ? img : null;
  } catch {
    return null;
  }
}

async function fetchItunesImage(
  title: string,
  kind: string,
  year?: string | null
): Promise<string | null> {
  try {
    const q = cleanTitle(title);
    const media = kind === "tv" ? "tvShow" : "movie";
    const entity = kind === "tv" ? "tvSeason" : "movie";
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      q
    )}&media=${media}&entity=${entity}&limit=5`;
    const res = await fetchWithSsrfGuard(url);
    if (!res.ok || !res.text.trim().startsWith("{")) return null;
    const json = JSON.parse(res.text);
    const results: any[] = json?.results || [];
    if (!results.length) return null;

    const targetYear = year ? parseInt(year, 10) : null;
    const matched =
      results.find((r) => {
        const name = String(r.trackName || r.collectionName || "").toLowerCase();
        const nameMatch = name.includes(q.toLowerCase());
        const yrMatch =
          !targetYear ||
          (r.releaseDate && String(r.releaseDate).startsWith(String(targetYear)));
        return nameMatch && yrMatch;
      }) || results[0];

    const art = matched?.artworkUrl100 || matched?.artworkUrl60;
    if (typeof art !== "string" || !art.startsWith("http")) return null;
    return art.replace(/\/\d+x\d+bb\./, "/600x600bb.");
  } catch {
    return null;
  }
}

async function fetchWikipediaImage(
  title: string,
  kind: string,
  year?: string | null
): Promise<string | null> {
  try {
    const q = cleanTitle(title);
    const mediaWord = kind === "tv" ? "TV series" : "film";
    const candidates = [
      year ? `${q} (${year} ${mediaWord})` : null,
      `${q} (${mediaWord})`,
      q,
    ].filter((c): c is string => Boolean(c));

    // 1. Exact title lookups with pilicense=any (includes fair-use movie/TV posters)
    for (const candidate of candidates) {
      const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
        candidate
      )}&prop=pageimages&pilicense=any&format=json&pithumbsize=600&redirects=1`;
      const res = await fetchWithSsrfGuard(url);
      if (!res.ok || !res.text.trim().startsWith("{")) continue;
      const json = JSON.parse(res.text);
      const pages = json?.query?.pages;
      if (!pages) continue;
      const firstKey = Object.keys(pages)[0];
      const thumb = firstKey ? pages[firstKey]?.thumbnail?.source : null;
      if (typeof thumb === "string" && thumb.startsWith("http")) {
        return thumb;
      }
    }

    // 2. Fallback: Wikipedia search generator (catches alternate titles / film series pages)
    const searchQuery = [q, year || "", mediaWord].filter(Boolean).join(" ");
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      searchQuery
    )}&gsrlimit=4&prop=pageimages&pilicense=any&format=json&pithumbsize=600`;
    const searchRes = await fetchWithSsrfGuard(searchUrl);
    if (searchRes.ok && searchRes.text.trim().startsWith("{")) {
      const json = JSON.parse(searchRes.text);
      const pagesObj = json?.query?.pages;
      if (pagesObj && typeof pagesObj === "object") {
        const sortedPages = Object.values(pagesObj as Record<string, any>).sort(
          (a, b) => (a?.index ?? 99) - (b?.index ?? 99)
        );
        for (const page of sortedPages) {
          const thumb = page?.thumbnail?.source;
          if (typeof thumb === "string" && thumb.startsWith("http")) {
            return thumb;
          }
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const title = url.searchParams.get("title")?.trim() || "";
  const year = url.searchParams.get("year");
  const kind = url.searchParams.get("kind") || "film";

  if (!title) {
    return NextResponse.json({ image: null }, { status: 400 });
  }

  const cacheKey = `${kind}_${title.toLowerCase()}_${year || ""}`;
  const cached = ARTWORK_CACHE.get(cacheKey);
  if (cached) {
    const ttl = cached.image ? CACHE_TTL_MS : MISS_TTL_MS;
    if (Date.now() - cached.ts < ttl) {
      return NextResponse.json(
        { image: cached.image },
        {
          headers: {
            "Cache-Control": cached.image
              ? "public, max-age=86400"
              : "no-store",
          },
        }
      );
    }
  }

  let image: string | null = null;
  if (kind === "tv") {
    image =
      (await fetchImdbSuggestionImage(title, kind, year)) ||
      (await fetchTvMazeImage(title)) ||
      (await fetchWikipediaImage(title, kind, year)) ||
      (await fetchItunesImage(title, kind, year));
  } else {
    image =
      (await fetchImdbSuggestionImage(title, kind, year)) ||
      (await fetchWikipediaImage(title, kind, year)) ||
      (await fetchItunesImage(title, kind, year));
  }

  ARTWORK_CACHE.set(cacheKey, { image, ts: Date.now() });

  return NextResponse.json(
    { image },
    {
      headers: {
        "Cache-Control": image ? "public, max-age=86400" : "no-store",
      },
    }
  );
}
