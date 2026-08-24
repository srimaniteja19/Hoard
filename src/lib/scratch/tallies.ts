import { ScrapRow } from "@/db/schema";

export interface TallyItem {
  key: string;
  label: string;
  count: number;
  deltaText: string;
  isUp: boolean;
  color: string;
}

export interface OnThisDayItem {
  id: string;
  title: string;
  dateStr: string;
  yearsAgo: number;
}

export interface GoneQuietItem {
  verb: string;
  daysAgo: number;
  isBrokenToday?: boolean;
}

export interface TagTreeNode {
  tag: string;
  count: number;
  color: string;
  children: TagTreeNode[];
}

export interface YearWallData {
  cells: Array<{ dateIso: string; count: number; shade: "a0" | "a1" | "a2" | "a3" | "a4" }>;
  daysInYear: number;
  daysLogged: number;
  longestRun: number;
  longestGap: number;
  currentRun: number;
}

const KIND_COLORS: Record<string, string> = {
  Film: "violet",
  Person: "pink",
  Book: "cyan",
  Game: "pink",
  Movement: "lime",
  Food: "orange",
  Place: "yellow",
  Made: "yellow",
  Audio: "violet",
};

/**
 * Builds a concise one-line summary for a day's log entries
 * e.g. "1 FILM · 10 MILES · 1 PERSON · 1 BOOK"
 */
export function buildDaySummary(logs: ScrapRow[]): string {
  if (logs.length === 0) return "NOTHING LOGGED";

  const parts: string[] = [];
  let films = 0;
  let miles = 0;
  let books = 0;
  let people = 0;
  let meals = 0;
  let places = 0;
  let made = 0;

  for (const s of logs) {
    const ent = s.entities || {};
    const label = ent.label;
    if (label === "Film") films++;
    else if (label === "Book") books++;
    else if (label === "Person") people++;
    else if (label === "Food") meals++;
    else if (label === "Place") places++;
    else if (label === "Made") made++;

    if (ent.unit === "MILES" && ent.measure) {
      miles += parseFloat(ent.measure) || 0;
    }
  }

  if (films > 0) parts.push(`${films} FILM${films > 1 ? "S" : ""}`);
  if (miles > 0) parts.push(`${Math.round(miles)} MILE${miles === 1 ? "" : "S"}`);
  if (books > 0) parts.push(`${books} BOOK${books > 1 ? "S" : ""}`);
  if (people > 0) parts.push(`${people} PERSON${people > 1 ? "S" : ""}`);
  if (meals > 0) parts.push(`${meals} MEAL${meals > 1 ? "S" : ""}`);
  if (places > 0) parts.push(`${places} NEW PLACE${places > 1 ? "S" : ""}`);
  if (made > 0) parts.push(`${made} MADE`);

  if (parts.length === 0) {
    return "A DAY WITH NO ENTITIES IN IT";
  }

  return parts.join(" · ");
}

/**
 * Computes self-building tallies with year-over-year deltas
 */
export function computeTallies(scraps: ScrapRow[], currentYear = new Date().getFullYear()): TallyItem[] {
  const logScraps = scraps.filter((s) => s.kind === "LOG");

  let filmsThisYear = 0;
  let filmsLastYear = 0;
  let booksThisYear = 0;
  let booksLastYear = 0;
  let milesThisYear = 0;
  let milesLastYear = 0;
  let cookedThisYear = 0;
  let cookedLastYear = 0;
  let placesThisYear = 0;
  let placesLastYear = 0;
  let peopleThisYear = 0;
  let peopleLastYear = 0;

  for (const s of logScraps) {
    const date = new Date((s.occurredOn || s.loggedFor) + "T00:00:00");
    const year = date.getFullYear();
    const ent = s.entities || {};
    const label = ent.label;

    if (year === currentYear) {
      if (label === "Film") filmsThisYear++;
      if (label === "Book") booksThisYear++;
      if (label === "Food") cookedThisYear++;
      if (label === "Place") placesThisYear++;
      if (label === "Person") peopleThisYear++;
      if (ent.unit === "MILES" && ent.measure) {
        milesThisYear += parseFloat(ent.measure) || 0;
      }
    } else if (year === currentYear - 1) {
      if (label === "Film") filmsLastYear++;
      if (label === "Book") booksLastYear++;
      if (label === "Food") cookedLastYear++;
      if (label === "Place") placesLastYear++;
      if (label === "Person") peopleLastYear++;
      if (ent.unit === "MILES" && ent.measure) {
        milesLastYear += parseFloat(ent.measure) || 0;
      }
    }
  }

  const formatDelta = (current: number, past: number) => {
    const diff = current - past;
    if (diff >= 0) {
      return { deltaText: `▲ +${diff}`, isUp: true };
    }
    return { deltaText: `▼ −${Math.abs(diff)}`, isUp: false };
  };

  const results: TallyItem[] = [];

  if (filmsThisYear > 0 || filmsLastYear > 0) {
    const d = formatDelta(filmsThisYear, filmsLastYear);
    results.push({ key: "films", label: "FILMS", count: filmsThisYear, deltaText: d.deltaText, isUp: d.isUp, color: "violet" });
  }
  if (booksThisYear > 0 || booksLastYear > 0) {
    const d = formatDelta(booksThisYear, booksLastYear);
    results.push({ key: "books", label: "BOOKS", count: booksThisYear, deltaText: d.deltaText, isUp: d.isUp, color: "cyan" });
  }
  if (milesThisYear > 0 || milesLastYear > 0) {
    const d = formatDelta(Math.round(milesThisYear), Math.round(milesLastYear));
    results.push({ key: "miles", label: "MILES", count: Math.round(milesThisYear), deltaText: d.deltaText, isUp: d.isUp, color: "lime" });
  }
  if (cookedThisYear > 0 || cookedLastYear > 0) {
    const d = formatDelta(cookedThisYear, cookedLastYear);
    results.push({ key: "cooked", label: "COOKED", count: cookedThisYear, deltaText: d.deltaText, isUp: d.isUp, color: "orange" });
  }
  if (placesThisYear > 0 || placesLastYear > 0) {
    const d = formatDelta(placesThisYear, placesLastYear);
    results.push({ key: "places", label: "NEW PLACES", count: placesThisYear, deltaText: d.deltaText, isUp: d.isUp, color: "yellow" });
  }
  if (peopleThisYear > 0 || peopleLastYear > 0) {
    const d = formatDelta(peopleThisYear, peopleLastYear);
    results.push({ key: "people", label: "PEOPLE SEEN", count: peopleThisYear, deltaText: d.deltaText, isUp: d.isUp, color: "pink" });
  }

  return results;
}

/**
 * Computes 365-day Year Wall matrix and stats for a given year
 */
export function computeYearWall(scraps: ScrapRow[], year = new Date().getFullYear()): YearWallData {
  const logScraps = scraps.filter((s) => s.kind === "LOG");

  const countsByDate = new Map<string, number>();
  for (const s of logScraps) {
    const dateKey = s.occurredOn || s.loggedFor;
    if (dateKey.startsWith(String(year))) {
      countsByDate.set(dateKey, (countsByDate.get(dateKey) || 0) + 1);
    }
  }

  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const totalDays = isLeap ? 366 : 365;

  const today = new Date();
  const isCurrentYear = today.getFullYear() === year;

  // Start from Jan 1
  const start = new Date(year, 0, 1);
  const cells: YearWallData["cells"] = [];

  let daysLogged = 0;
  let currentStreak = 0;
  let longestRun = 0;
  let currentRun = 0;
  let longestGap = 0;
  let currentGap = 0;

  const daysSoFar = isCurrentYear
    ? Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : totalDays;

  for (let i = 0; i < Math.min(totalDays, daysSoFar); i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dayStr = String(d.getDate()).padStart(2, "0");
    const dateIso = `${year}-${m}-${dayStr}`;

    const count = countsByDate.get(dateIso) || 0;
    let shade: "a0" | "a1" | "a2" | "a3" | "a4" = "a0";

    if (count >= 4) shade = "a4";
    else if (count === 3) shade = "a3";
    else if (count === 2) shade = "a2";
    else if (count === 1) shade = "a1";

    if (count > 0) {
      daysLogged++;
      currentRun++;
      if (currentRun > longestRun) longestRun = currentRun;
      if (currentGap > longestGap) longestGap = currentGap;
      currentGap = 0;
    } else {
      currentGap++;
      currentRun = 0;
    }

    cells.push({ dateIso, count, shade });
  }

  if (currentGap > longestGap) longestGap = currentGap;

  return {
    cells,
    daysInYear: daysSoFar,
    daysLogged,
    longestRun,
    longestGap,
    currentRun,
  };
}

/**
 * Finds log entries on the same month & day in previous years
 */
export function getOnThisDay(scraps: ScrapRow[], referenceDate = new Date()): OnThisDayItem[] {
  const currentMonth = referenceDate.getMonth();
  const currentDay = referenceDate.getDate();
  const currentYear = referenceDate.getFullYear();

  const results: OnThisDayItem[] = [];

  for (const s of scraps) {
    if (s.kind !== "LOG") continue;
    const d = new Date((s.occurredOn || s.loggedFor) + "T00:00:00");
    if (d.getMonth() === currentMonth && d.getDate() === currentDay && d.getFullYear() < currentYear) {
      const yearsAgo = currentYear - d.getFullYear();
      const ent = s.entities || {};
      const title = ent.title || s.content;
      results.push({
        id: s.id,
        title: `${ent.verb ? ent.verb + " " : ""}${title}`,
        dateStr: `${yearsAgo} YEAR${yearsAgo > 1 ? "S" : ""} AGO · ${d.getDate()} ${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getFullYear()}`,
        yearsAgo,
      });
    }
  }

  return results.slice(0, 4);
}

const MONTH_NAMES_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/**
 * Finds habitual verbs that haven't been logged in > 14 days
 */
export function getGoneQuiet(scraps: ScrapRow[], referenceDate = new Date()): GoneQuietItem[] {
  const logScraps = scraps.filter((s) => s.kind === "LOG");

  // Track latest date per verb and total count
  const verbHistory = new Map<string, { latestDate: Date; totalCount: number }>();

  for (const s of logScraps) {
    const verb = s.entities?.verb || "";
    if (!verb || verb === "NOTED") continue;

    const date = new Date((s.occurredOn || s.loggedFor) + "T00:00:00");
    const existing = verbHistory.get(verb);

    if (!existing) {
      verbHistory.set(verb, { latestDate: date, totalCount: 1 });
    } else {
      existing.totalCount++;
      if (date > existing.latestDate) {
        existing.latestDate = date;
      }
    }
  }

  const results: GoneQuietItem[] = [];
  const refTime = referenceDate.getTime();

  for (const [verb, data] of verbHistory.entries()) {
    const diffDays = Math.floor((refTime - data.latestDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 14 && data.totalCount >= 2) {
      results.push({
        verb,
        daysAgo: diffDays,
        isBrokenToday: diffDays === 0,
      });
    }
  }

  return results.sort((a, b) => b.daysAgo - a.daysAgo).slice(0, 4);
}

/**
 * Derives a nested Tag Tree from flat tag co-occurrences
 * If #walks appears on 12 scraps and 10 of those also carry #fitness, #walks nests under #fitness
 */
export function buildTagTree(scraps: ScrapRow[]): TagTreeNode[] {
  const tagCounts = new Map<string, number>();
  const coOccurrences = new Map<string, Map<string, number>>();

  for (const s of scraps) {
    const tags = Array.from(new Set([
      ...(s.tags || []),
      ...((s.content + " " + (s.notes || "")).match(/#[a-zA-Z][\w-]*/g) || []).map((t) => t.toLowerCase()),
    ]));

    for (const t of tags) {
      tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
      if (!coOccurrences.has(t)) coOccurrences.set(t, new Map<string, number>());
      const coMap = coOccurrences.get(t)!;

      for (const other of tags) {
        if (other !== t) {
          coMap.set(other, (coMap.get(other) || 0) + 1);
        }
      }
    }
  }

  // Find parent-child relationships
  const parentMap = new Map<string, string>(); // child -> parent

  for (const [tag, count] of tagCounts.entries()) {
    const coMap = coOccurrences.get(tag);
    if (!coMap) continue;

    let bestParent: string | null = null;
    let highestRatio = 0;

    for (const [otherTag, shared] of coMap.entries()) {
      const otherCount = tagCounts.get(otherTag) || 0;
      // Candidate parent must be more frequent
      if (otherCount > count) {
        const ratio = shared / count;
        if (ratio >= 0.55 && ratio > highestRatio) {
          highestRatio = ratio;
          bestParent = otherTag;
        }
      }
    }

    if (bestParent) {
      parentMap.set(tag, bestParent);
    }
  }

  // Build tree
  const colorPalette = ["orange", "violet", "cyan", "lime", "pink", "yellow"];
  const roots: TagTreeNode[] = [];
  const childrenMap = new Map<string, TagTreeNode[]>();

  for (const [tag, count] of tagCounts.entries()) {
    const parent = parentMap.get(tag);
    const node: TagTreeNode = {
      tag,
      count,
      color: colorPalette[Math.abs(hashString(tag)) % colorPalette.length],
      children: [],
    };

    if (parent) {
      if (!childrenMap.has(parent)) childrenMap.set(parent, []);
      childrenMap.get(parent)!.push(node);
    }
  }

  for (const [tag, count] of tagCounts.entries()) {
    if (!parentMap.has(tag)) {
      const node: TagTreeNode = {
        tag,
        count,
        color: colorPalette[Math.abs(hashString(tag)) % colorPalette.length],
        children: (childrenMap.get(tag) || []).sort((a, b) => b.count - a.count),
      };
      roots.push(node);
    }
  }

  return roots.sort((a, b) => b.count - a.count);
}

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return hash;
}
