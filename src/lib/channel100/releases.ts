import { ChannelMediaItem, ReleasePeriod } from "./types";
import { resolveCountryMeta } from "./verygoodfilms";

const MAJOR_PLATFORMS = new Set([
  "netflix",
  "apple tv+",
  "apple tv",
  "amazon prime video",
  "prime video",
  "hulu",
  "max",
  "hbo",
  "hbo max",
  "disney+",
  "disney+ hotstar",
  "hotstar",
  "jiocinema",
  "sonyliv",
  "zee5",
  "aha",
  "sun nxt",
  "paramount+",
  "peacock",
  "fx",
  "amc",
  "amc+",
  "showtime",
  "starz",
  "tubi",
  "roku",
]);

const INDIAN_LANGUAGES = new Set([
  "hindi",
  "telugu",
  "tamil",
  "malayalam",
  "kannada",
  "bengali",
  "marathi",
  "gujarati",
  "punjabi",
  "odia",
  "assamese",
  "urdu",
  "konkani",
  "bhojpuri",
  "kashmiri",
  "manipuri",
  "sanskrit",
  "sindhi",
  "tulu",
]);

const INDIAN_PLATFORMS = new Set([
  "disney+ hotstar",
  "hotstar",
  "jiocinema",
  "sonyliv",
  "zee5",
  "aha",
  "sun nxt",
]);

const EXTRA_ALLOWED_LANGUAGES = new Set([
  "spanish",
  "german",
]);

const HOLLYWOOD_COUNTRIES = new Set([
  "",
  "us",
  "usa",
  "united states",
  "united states of america",
]);

export function isHollywoodOrIndianRelease(
  countryName?: string,
  language?: string,
  platform?: string
): boolean {
  const c = (countryName || "").trim().toLowerCase();
  const l = (language || "").trim().toLowerCase();
  const p = (platform || "").trim().toLowerCase();

  const isIndian =
    c === "india" ||
    c === "in" ||
    INDIAN_LANGUAGES.has(l) ||
    INDIAN_PLATFORMS.has(p);
  if (isIndian) {
    // When country is India and language is specified, still allow all Indian languages + English
    return l === "" || l === "english" || INDIAN_LANGUAGES.has(l) || EXTRA_ALLOWED_LANGUAGES.has(l);
  }

  if (EXTRA_ALLOWED_LANGUAGES.has(l)) return true;

  const isHollywood =
    HOLLYWOOD_COUNTRIES.has(c) && (l === "" || l === "english");
  return isHollywood;
}

function resolveReleaseLanguage(
  countryName: string,
  rawLanguage?: string
): { lang: string; langFlag: string } {
  const { lang: countryLang, langFlag } = resolveCountryMeta(
    countryName,
    rawLanguage
  );
  const trimmed = (rawLanguage || "").trim();
  if (trimmed) {
    const lower = trimmed.toLowerCase();
    if (
      INDIAN_LANGUAGES.has(lower) ||
      EXTRA_ALLOWED_LANGUAGES.has(lower) ||
      lower === "english"
    ) {
      const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      const flag =
        lower === "spanish"
          ? "🇪🇸"
          : lower === "german"
          ? "🇩🇪"
          : INDIAN_LANGUAGES.has(lower)
          ? "🇮🇳"
          : langFlag;
      return { lang: normalized, langFlag: flag };
    }
  }
  return { lang: countryLang, langFlag };
}

function stripHtml(raw: string): string {
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

export function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getWeekDateStrings(anchor: Date = new Date()): string[] {
  const dates: string[] = [];
  for (let offset = -1; offset <= 5; offset++) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + offset);
    dates.push(formatIsoDate(d));
  }
  return dates;
}

export function classifyReleasePeriod(
  releaseDateStr: string,
  anchor: Date = new Date()
): Exclude<ReleasePeriod, "all"> {
  const todayStr = formatIsoDate(anchor);
  if (releaseDateStr === todayStr) return "day";

  const target = new Date(`${releaseDateStr}T12:00:00`);
  if (!Number.isNaN(target.getTime())) {
    const diffDays = Math.abs(
      (target.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays <= 7) return "week";
    if (
      target.getFullYear() === anchor.getFullYear() &&
      target.getMonth() === anchor.getMonth()
    ) {
      return "month";
    }
  }
  return "year";
}

export function formatReleaseBadge(releaseDateStr?: string): string {
  if (!releaseDateStr) return "Upcoming";
  const todayStr = formatIsoDate(new Date());
  if (releaseDateStr === todayStr) return "Today";

  const d = new Date(`${releaseDateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return releaseDateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function normalizePlatformName(rawName?: string): string {
  if (!rawName) return "Streaming";
  const lower = rawName.trim().toLowerCase();
  if (lower.includes("amazon") || lower === "prime video") return "Prime Video";
  if (lower.includes("apple")) return "Apple TV+";
  if (lower.includes("hotstar")) return "Disney+ Hotstar";
  if (lower.includes("disney")) return "Disney+";
  if (lower.includes("jiocinema")) return "JioCinema";
  if (lower.includes("sonyliv")) return "SonyLIV";
  if (lower.includes("zee5")) return "ZEE5";
  if (lower === "aha") return "Aha";
  if (lower.includes("sun nxt")) return "Sun NXT";
  if (lower === "hbo" || lower === "max" || lower === "hbo max") return "Max";
  if (lower.includes("paramount")) return "Paramount+";
  if (lower.includes("peacock")) return "Peacock";
  if (lower.includes("netflix")) return "Netflix";
  if (lower.includes("hulu")) return "Hulu";
  if (lower.includes("crunchyroll")) return "Crunchyroll";
  return rawName.trim();
}

export function parseTvMazeScheduleEntries(
  entries: any[],
  anchor: Date = new Date()
): ChannelMediaItem[] {
  if (!Array.isArray(entries)) return [];
  const results: ChannelMediaItem[] = [];
  const seenShowDate = new Set<string>();

  for (const ep of entries) {
    const show = ep?._embedded?.show || ep?.show;
    if (!show || !show.name) continue;

    const rawPlatform =
      show.webChannel?.name || show.network?.name || "";
    const platform = normalizePlatformName(rawPlatform);
    const isMajor =
      MAJOR_PLATFORMS.has(rawPlatform.toLowerCase()) ||
      MAJOR_PLATFORMS.has(platform.toLowerCase());

    // Keep major streaming/broadcast platforms first; skip obscure local feeds
    if (!isMajor) continue;

    const rawCountryName =
      show.webChannel?.country?.name ||
      show.network?.country?.name ||
      "";
    const rawLanguage = show.language || "";

    if (!isHollywoodOrIndianRelease(rawCountryName, rawLanguage, platform)) {
      continue;
    }

    const airdate: string = ep.airdate || formatIsoDate(anchor);
    const dedupeKey = `${show.id || show.name}_${airdate}`;
    if (seenShowDate.has(dedupeKey)) continue;
    seenShowDate.add(dedupeKey);

    const countryName = rawCountryName || rawLanguage || "USA";
    const { lang, langFlag } = resolveReleaseLanguage(countryName, rawLanguage);
    const genres: string[] = Array.isArray(show.genres) ? show.genres : [];
    const primaryGenre = genres[0] || "Series";
    const mins = Number(ep.runtime || show.averageRuntime || show.runtime) || 45;
    const seasonNum = Number(ep.season) || 1;
    const epNum = Number(ep.number) || 1;
    const epTag = `S${seasonNum}·E${epNum}${ep.name ? ` “${ep.name}”` : ""}`;
    const summary =
      stripHtml(String(ep.summary || show.summary || "")).slice(0, 260) ||
      `New episode (${epTag}) releasing on ${platform} on ${airdate}.`;

    const imdbId = show.externals?.imdb;
    const year = parseInt(airdate.slice(0, 4), 10) || anchor.getFullYear();

    results.push({
      kind: "releases",
      id: imdbId
        ? `rel_${imdbId}`
        : `rel_tv_${show.id || show.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
      rank: results.length + 1,
      title: String(show.name),
      years: `${airdate} · ${epTag}`,
      year,
      start: year,
      network: platform,
      where: platform,
      genre: primaryGenre,
      imdb: Number(show.rating?.average) || 7.6,
      icon: "tv",
      blurb: summary,
      mins,
      hours: +(mins / 60).toFixed(1),
      sub: `${epTag} · ${airdate}`,
      lang,
      langFlag,
      customKind: "tv",
      season: seasonNum,
      episode: epNum,
      releaseDate: airdate,
      releasePeriod: classifyReleasePeriod(airdate, anchor),
    });
  }

  return results;
}

export function parseWikidataReleaseFilms(
  sparqlJson: any,
  anchor: Date = new Date()
): ChannelMediaItem[] {
  const bindings: any[] = sparqlJson?.results?.bindings || [];
  if (!Array.isArray(bindings)) return [];

  const results: ChannelMediaItem[] = [];
  const seen = new Set<string>();

  for (const row of bindings) {
    const title = row.filmLabel?.value;
    const rawDate = row.pubDate?.value;
    if (!title || /^Q\d+$/.test(title) || !rawDate) continue;

    const releaseDate = String(rawDate).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) continue;

    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const director = row.directorLabel?.value || "Feature Release";
    const country = row.countryLabel?.value || "USA";
    const originalLang = row.langLabel?.value || "";
    if (!isHollywoodOrIndianRelease(country, originalLang)) continue;
    const genre = row.genreLabel?.value || "Feature Film";
    const { lang, langFlag } = resolveReleaseLanguage(country, originalLang);
    const year = parseInt(releaseDate.slice(0, 4), 10) || anchor.getFullYear();
    const imdbId = row.imdbId?.value;
    const mins = Math.max(70, Math.min(240, Math.round(Number(row.duration?.value) || 112)));

    results.push({
      kind: "releases",
      id: imdbId
        ? `rel_${imdbId}`
        : `rel_film_${title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${year}`,
      rank: results.length + 1,
      title,
      year,
      start: year,
      director,
      where: "Theatrical / Streaming",
      genre,
      imdb: 7.5,
      icon: "clapper",
      blurb: `Directed by ${director} (${country}). Scheduled release: ${releaseDate}.`,
      mins,
      hours: +(mins / 60).toFixed(1),
      sub: `${country} · ${releaseDate}`,
      lang,
      langFlag,
      customKind: "film",
      releaseDate,
      releasePeriod: classifyReleasePeriod(releaseDate, anchor),
    });
  }

  return results;
}

export function sortAndDedupeReleases(
  items: ChannelMediaItem[]
): ChannelMediaItem[] {
  const map = new Map<string, ChannelMediaItem>();
  for (const item of items) {
    const key = `${item.title.toLowerCase().replace(/[^a-z0-9]/g, "")}_${
      item.customKind || "tv"
    }`;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  const merged = Array.from(map.values());
  merged.sort((a, b) => {
    const dA = a.releaseDate || "9999-12-31";
    const dB = b.releaseDate || "9999-12-31";
    return dA.localeCompare(dB) || b.imdb - a.imdb;
  });

  return merged.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}

