import { NextResponse } from "next/server";
import { fetchWithSsrfGuard } from "@/lib/security/ssrfGuard";

const ARTWORK_CACHE = new Map<string, { image: string | null; ts: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function cleanTitle(raw: string): string {
  return raw.replace(/\s*\([^)]*\)\s*/g, "").trim();
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
    const candidates = [
      q,
      year ? `${q} (${year} ${kind === "tv" ? "TV series" : "film"})` : null,
      `${q} (${kind === "tv" ? "TV series" : "film"})`,
    ].filter((c): c is string => Boolean(c));

    for (const candidate of candidates) {
      const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
        candidate
      )}&prop=pageimages&format=json&pithumbsize=600&redirects=1`;
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
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(
      { image: cached.image },
      { headers: { "Cache-Control": "public, max-age=86400" } }
    );
  }

  let image: string | null = null;
  if (kind === "tv") {
    image =
      (await fetchTvMazeImage(title)) ||
      (await fetchItunesImage(title, kind, year)) ||
      (await fetchWikipediaImage(title, kind, year));
  } else {
    image =
      (await fetchItunesImage(title, kind, year)) ||
      (await fetchWikipediaImage(title, kind, year));
  }

  ARTWORK_CACHE.set(cacheKey, { image, ts: Date.now() });

  return NextResponse.json(
    { image },
    { headers: { "Cache-Control": "public, max-age=86400" } }
  );
}
