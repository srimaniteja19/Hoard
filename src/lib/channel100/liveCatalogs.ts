import { ChannelMediaItem } from "./types";
import { resolveCountryMeta } from "./verygoodfilms";

function stripHtmlTags(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&apos;|&#039;|&#x27;|&#8217;|&rsquo;/gi, "’")
    .replace(/&quot;|&#34;|&#8220;|&#8221;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#8211;|&ndash;/gi, "–")
    .replace(/\s+/g, " ")
    .trim();
}

function slugId(prefix: string, title: string, year?: number | string): string {
  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 36);
  return `${prefix}_${slug}${year ? `_${year}` : ""}`;
}

/**
 * Parse IMDb chart HTML (__NEXT_DATA__ or application/ld+json ItemList)
 * Works for both https://www.imdb.com/chart/toptv/ (Top 250 TV) and
 * https://www.imdb.com/chart/top/ (Top 250 Movies).
 */
export function parseImdbChartHtml(
  html: string,
  kind: "tv" | "film"
): ChannelMediaItem[] {
  if (!html) return [];
  const items: ChannelMediaItem[] = [];

  // 1. Try __NEXT_DATA__ JSON payload
  const nextDataMatch = html.match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (nextDataMatch?.[1]) {
    try {
      const parsed = JSON.parse(nextDataMatch[1]);
      const edges: any[] =
        parsed?.props?.pageProps?.pageData?.chartTitles?.edges || [];
      if (Array.isArray(edges) && edges.length > 0) {
        edges.forEach((edge, idx) => {
          const node = edge?.node || {};
          const imdbId = node.id || "";
          const title = node.titleText?.text || "";
          if (!title) return;

          const startYear = Number(node.releaseYear?.year) || 2000;
          const endYear = node.releaseYear?.endYear;
          const years =
            kind === "tv"
              ? endYear
                ? `${startYear}–${endYear}`
                : `${startYear}–`
              : undefined;

          const rating =
            Number(node.ratingsSummary?.aggregateRating) || 8.5;
          const genres: string[] = (node.titleGenres?.genres || [])
            .map((g: any) => g?.genre?.text)
            .filter(Boolean);
          const primaryGenre = genres[0] || "Drama";
          const subGenres = genres.slice(1, 3).join(" · ") || primaryGenre;

          const plot =
            stripHtmlTags(node.plot?.plotText?.plainText || "") ||
            `${title} (${startYear}) — ranked #${idx + 1} on IMDb.`;

          const runtimeSecs = Number(node.runtime?.seconds) || 0;
          const runtimeMins =
            runtimeSecs > 0
              ? Math.round(runtimeSecs / 60)
              : kind === "tv"
              ? 50
              : 125;

          const epCount = Number(node.episodes?.episodes?.total) || 24;
          const hours =
            kind === "tv"
              ? Math.max(2, Math.round((epCount * runtimeMins) / 60))
              : +(runtimeMins / 60).toFixed(1);

          const principalCredits: any[] = node.principalCredits || [];
          const directorOrCreator =
            principalCredits[0]?.credits?.[0]?.name?.nameText?.text ||
            (kind === "tv" ? "Series" : "Feature Film");

          items.push({
            kind,
            id: imdbId ? `${kind}_${imdbId}` : slugId(kind, title, startYear),
            rank: Number(edge?.currentRank) || idx + 1,
            title,
            years,
            year: startYear,
            start: startYear,
            network: kind === "tv" ? directorOrCreator : undefined,
            director: kind === "film" ? directorOrCreator : undefined,
            where: "Stream / VOD",
            genre: primaryGenre,
            imdb: rating,
            icon: kind === "tv" ? "tv" : "clapper",
            blurb: plot,
            seasons: kind === "tv" ? Math.max(1, Math.round(epCount / 10)) : undefined,
            eps: kind === "tv" ? epCount : undefined,
            mins: runtimeMins,
            sub: subGenres,
            hours,
            lang: "English",
            langFlag: "🌐",
          });
        });
      }
    } catch {
      // Fall through to JSON-LD parser
    }
  }

  if (items.length > 0) return items;

  // 2. Try Schema.org application/ld+json ItemList
  const ldRegex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let ldMatch: RegExpExecArray | null;
  while ((ldMatch = ldRegex.exec(html)) !== null) {
    try {
      const ld = JSON.parse(ldMatch[1]);
      if (ld?.["@type"] === "ItemList" && Array.isArray(ld.itemListElement)) {
        ld.itemListElement.forEach((el: any, idx: number) => {
          const item = el?.item || el;
          const title = stripHtmlTags(item?.alternateName || item?.name || "");
          if (!title) return;

          const urlStr = String(item?.url || "");
          const ttMatch = urlStr.match(/(tt\d+)/);
          const imdbId = ttMatch ? ttMatch[1] : "";

          const rating =
            Number(item?.aggregateRating?.ratingValue) || 8.5;
          const genreArr = Array.isArray(item?.genre)
            ? item.genre
            : item?.genre
            ? [item.genre]
            : ["Drama"];
          const primaryGenre = String(genreArr[0] || "Drama");
          const subGenres = genreArr.slice(1, 3).join(" · ") || primaryGenre;

          // Parse ISO 8601 duration e.g. PT2H22M or PT55M
          const durStr = String(item?.duration || "");
          const hMatch = durStr.match(/(\d+)H/i);
          const mMatch = durStr.match(/(\d+)M/i);
          const parsedMins =
            (hMatch ? parseInt(hMatch[1], 10) * 60 : 0) +
            (mMatch ? parseInt(mMatch[1], 10) : 0);
          const mins = parsedMins || (kind === "tv" ? 50 : 120);
          const hours =
            kind === "tv"
              ? Math.max(6, Math.round((20 * mins) / 60))
              : +(mins / 60).toFixed(1);

          const desc =
            stripHtmlTags(item?.description || "") ||
            `Ranked #${idx + 1} on IMDb.`;

          items.push({
            kind,
            id: imdbId ? `${kind}_${imdbId}` : slugId(kind, title, idx + 1),
            rank: idx + 1,
            title,
            years: kind === "tv" ? "IMDb Top 250" : undefined,
            year: 2015,
            start: 2015,
            network: kind === "tv" ? "TV Series" : undefined,
            director: kind === "film" ? "Feature Film" : undefined,
            where: "Stream / VOD",
            genre: primaryGenre,
            imdb: rating,
            icon: kind === "tv" ? "tv" : "clapper",
            blurb: desc,
            seasons: kind === "tv" ? 2 : undefined,
            eps: kind === "tv" ? 20 : undefined,
            mins,
            sub: subGenres,
            hours,
            lang: "English",
            langFlag: "🌐",
          });
        });
        if (items.length > 0) break;
      }
    } catch {
      // Continue
    }
  }

  return items;
}

/**
 * Parse TVMaze open REST API pages into top-rated TV series (up to 250)
 */
export function parseTvMazeShows(rawShows: any[], limit = 250): ChannelMediaItem[] {
  if (!Array.isArray(rawShows)) return [];

  const valid = rawShows.filter(
    (s) => s && typeof s.name === "string" && Number(s.rating?.average) > 0
  );

  valid.sort(
    (a, b) =>
      Number(b.rating?.average || 0) - Number(a.rating?.average || 0) ||
      Number(b.weight || 0) - Number(a.weight || 0)
  );

  return valid.slice(0, limit).map((show, idx) => {
    const startYear = show.premiered
      ? parseInt(String(show.premiered).slice(0, 4), 10) || 2010
      : 2010;
    const endYear = show.ended
      ? parseInt(String(show.ended).slice(0, 4), 10)
      : undefined;
    const years =
      show.status === "Ended" && endYear
        ? startYear === endYear
          ? `${startYear}`
          : `${startYear}–${endYear}`
        : `${startYear}–`;

    const networkName =
      show.network?.name ||
      show.webChannel?.name ||
      "Broadcast / Streaming";
    const countryName =
      show.network?.country?.name ||
      show.webChannel?.country?.name ||
      show.language ||
      "USA";
    const { lang, langFlag } = resolveCountryMeta(countryName, show.language);

    const genres: string[] = Array.isArray(show.genres) ? show.genres : [];
    const primaryGenre = genres[0] || "Drama";
    const subGenres = genres.slice(1, 3).join(" · ") || primaryGenre;

    const mins = Number(show.averageRuntime || show.runtime) || 50;
    const estEps = show.status === "Ended" && endYear
      ? Math.max(8, (endYear - startYear + 1) * 10)
      : 24;
    const hours = Math.max(4, Math.round((estEps * mins) / 60));
    const seasons = Math.max(1, Math.round(estEps / 10));
    const imdbId = show.externals?.imdb;

    return {
      kind: "tv",
      id: imdbId ? `tv_${imdbId}` : `tv_tvmaze_${show.id}`,
      rank: idx + 1,
      title: String(show.name),
      years,
      year: startYear,
      start: startYear,
      network: networkName,
      where: show.webChannel?.name || networkName,
      genre: primaryGenre,
      imdb: Number(show.rating?.average) || 8.5,
      icon: "tv",
      blurb:
        stripHtmlTags(String(show.summary || "")).slice(0, 280) ||
        `${show.name} (${years}) on ${networkName}.`,
      seasons,
      eps: estEps,
      mins,
      sub: subGenres,
      hours,
      lang,
      langFlag,
    };
  });
}

/**
 * Parse Letterboxd list HTML pages (e.g. Official Top 250 / Top 500 Narrative Feature Films)
 */
export function parseLetterboxdListHtml(
  htmlPages: string[],
  limit = 500
): ChannelMediaItem[] {
  const results: ChannelMediaItem[] = [];
  const seen = new Set<string>();

  for (const html of htmlPages) {
    if (!html) continue;

    // Match poster containers / react-component / data-film-* blocks on Letterboxd
    const posterRegex =
      /<(?:li|div)[^>]+(?:data-film-slug|data-item-slug|data-target-link)=["']([^"']+)["'][^>]*>([\s\S]*?)<\/(?:li|div)>/gi;
    let m: RegExpExecArray | null;
    while ((m = posterRegex.exec(html)) !== null) {
      const fullTag = m[0];
      const slug = m[1].replace(/^\/?film\//, "").replace(/\/$/, "");
      if (!slug || seen.has(slug)) continue;

      const nameAttr =
        fullTag.match(/data-item-name=["']([^"']+)["']/i)?.[1] ||
        fullTag.match(/data-film-name=["']([^"']+)["']/i)?.[1] ||
        fullTag.match(/alt=["']([^"']+)["']/i)?.[1] ||
        "";
      if (!nameAttr) continue;

      const decoded = stripHtmlTags(nameAttr);
      const yrMatch =
        decoded.match(/\((\d{4})\)$/) ||
        fullTag.match(/data-film-release-year=["'](\d{4})["']/i);
      const year = yrMatch ? parseInt(yrMatch[1], 10) : 2000;
      const cleanTitle = decoded.replace(/\s*\(\d{4}\)\s*$/, "").trim();
      if (!cleanTitle) continue;

      seen.add(slug);
      const rank = results.length + 1;
      results.push({
        kind: "film",
        id: `lb_${slug.replace(/[^a-z0-9_]/gi, "_")}`,
        rank,
        title: cleanTitle,
        year,
        start: year,
        director: "Letterboxd Official Top 500",
        where: "Criterion / VOD",
        genre: "Feature Film",
        imdb: 8.4,
        icon: "clapper",
        blurb: `${cleanTitle} (${year}) — Ranked #${rank} in the Letterboxd Official Top Narrative Feature Films canon.`,
        mins: 120,
        hours: 2.0,
        sub: `Letterboxd #${rank}`,
        lang: "International",
        langFlag: "🎬",
      });

      if (results.length >= limit) return results;
    }
  }

  return results;
}

/**
 * Parse Wikidata SPARQL JSON results for acclaimed films with Letterboxd IDs (P6127)
 */
export function parseWikidataFilmsJson(
  sparqlJson: any,
  limit = 500
): ChannelMediaItem[] {
  const bindings: any[] = sparqlJson?.results?.bindings || [];
  if (!Array.isArray(bindings) || bindings.length === 0) return [];

  const results: ChannelMediaItem[] = [];
  const seen = new Set<string>();

  for (const row of bindings) {
    const title = row.filmLabel?.value;
    if (!title || /^Q\d+$/.test(title)) continue;

    const lbId = row.lbId?.value || "";
    const imdbId = row.imdbId?.value || "";
    const dedupeKey = lbId || imdbId || title.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const yearStr = row.year?.value || "";
    const year = parseInt(String(yearStr).slice(0, 4), 10) || 1995;
    const director = row.directorLabel?.value || "Acclaimed Director";
    const country = row.countryLabel?.value || "International";
    const genre = row.genreLabel?.value || "Drama";
    const mins = Math.max(
      45,
      Math.min(360, Math.round(Number(row.duration?.value) || 118))
    );
    const { lang, langFlag } = resolveCountryMeta(country);
    const rank = results.length + 1;

    results.push({
      kind: "film",
      id: lbId
        ? `lb_${lbId.replace(/[^a-z0-9_]/gi, "_")}`
        : imdbId
        ? `film_${imdbId}`
        : slugId("lb", title, year),
      rank,
      title,
      year,
      start: year,
      director,
      where: "Criterion / Kanopy / VOD",
      genre,
      imdb: +(8.6 - Math.min(1.2, (rank / limit) * 1.1)).toFixed(1),
      icon: "clapper",
      blurb: `Directed by ${director} (${country}, ${year}). Featured in the Letterboxd Top 500 narrative feature canon.`,
      mins,
      hours: +(mins / 60).toFixed(1),
      sub: `${country} · ${genre}`,
      lang,
      langFlag,
    });

    if (results.length >= limit) break;
  }

  return results;
}

/**
 * Merge and deduplicate ChannelMediaItem lists up to target limit, re-numbering rank 1..N
 */
export function mergeCatalogItems(
  lists: ChannelMediaItem[][],
  limit: number
): ChannelMediaItem[] {
  const merged: ChannelMediaItem[] = [];
  const seenTitles = new Set<string>();

  for (const list of lists) {
    for (const item of list) {
      const norm = item.title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
      if (!norm || seenTitles.has(norm)) continue;
      seenTitles.add(norm);
      merged.push({
        ...item,
        rank: merged.length + 1,
      });
      if (merged.length >= limit) return merged;
    }
  }

  return merged;
}

