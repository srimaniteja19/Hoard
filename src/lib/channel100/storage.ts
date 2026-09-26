import {
  Channel100Store,
  Channel100StatsData,
  ChannelMediaItem,
  ShowUserRecord,
  ViewFilterState,
  ViewSort,
  CatalogConfig,
} from "./types";
import { CATALOGS } from "./data";

export const PRIMARY_LS_KEY = "hoard.ch100.v1";
export const LEGACY_LS_KEY = "ch100.v1";
export const VIEW_LS_KEY = "hoard.ch100.view";

export function loadStore(): Channel100Store {
  if (typeof window === "undefined") {
    return { shows: {}, updated: 0 };
  }

  try {
    const raw =
      localStorage.getItem(PRIMARY_LS_KEY) || localStorage.getItem(LEGACY_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.shows === "object") {
        return {
          shows: parsed.shows,
          custom: parsed.custom || {},
          updated: parsed.updated || Date.now(),
        };
      }
    }
  } catch (err) {
    console.error("[Channel100] Failed to load store from localStorage", err);
  }

  return { shows: {}, updated: 0 };
}

export function saveStore(store: Channel100Store): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(store);
    localStorage.setItem(PRIMARY_LS_KEY, serialized);
    localStorage.setItem(LEGACY_LS_KEY, serialized);
  } catch (err) {
    console.error("[Channel100] Failed to save store to localStorage", err);
  }
}

export function loadSavedView(): Partial<ViewFilterState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(VIEW_LS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("[Channel100] Failed to load view settings", err);
  }
  return {};
}

export function saveViewSettings(settings: Partial<ViewFilterState>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VIEW_LS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error("[Channel100] Failed to save view settings", err);
  }
}

export function getMediaRecord(
  store: Channel100Store,
  id: string
): ShowUserRecord {
  return store.shows[id] || {};
}

export function computeStats(
  items: ChannelMediaItem[],
  store: Channel100Store
): Channel100StatsData {
  let seen = 0;
  let watching = 0;
  let want = 0;
  let hoursSeen = 0;
  let hoursWant = 0;
  let hoursTotal = 0;

  items.forEach((item) => {
    hoursTotal += item.hours;
    const rec = getMediaRecord(store, item.id);
    if (rec.s === "seen") {
      seen++;
      hoursSeen += item.hours;
    } else if (rec.s === "watching") {
      watching++;
      hoursWant += item.hours;
    } else if (rec.s === "want") {
      want++;
      hoursWant += item.hours;
    }
  });

  const untouched = Math.max(0, items.length - seen - watching - want);
  const percentSeen = items.length ? Math.round((seen / items.length) * 100) : 0;

  return {
    seen,
    watching,
    want,
    untouched,
    percentSeen,
    hoursSeen,
    hoursWant,
    hoursTotal,
  };
}


export function filterAndSortMedia(
  items: ChannelMediaItem[],
  store: Channel100Store,
  filters: ViewFilterState,
  catalog: CatalogConfig
): ChannelMediaItem[] {
  const q = filters.q.trim().toLowerCase();

  const filtered = items.filter((item) => {
    const rec = getMediaRecord(store, item.id);
    const status = rec.s || "";

    if (filters.status === "none" && status) return false;
    if (
      ["seen", "want", "watching"].includes(filters.status) &&
      status !== filters.status
    )
      return false;

    if (filters.genre !== "all" && item.genre !== filters.genre) return false;
    if (filters.where !== "all" && item.where !== filters.where) return false;
    if (filters.lang && filters.lang !== "all" && item.lang !== filters.lang) return false;
    if (filters.customKind && filters.customKind !== "all" && item.customKind !== filters.customKind) return false;

    if (filters.len && filters.len !== "all") {
      const band = catalog.band(item);
      if (band !== filters.len) return false;
    }

    if (q) {
      const haystack = `${item.title} ${item.network || ""} ${item.director || ""} ${item.lang || ""} ${item.where} ${item.genre} ${item.sub} ${item.blurb}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });

  const sorters: Record<ViewSort, (a: ChannelMediaItem, b: ChannelMediaItem) => number> = {
    rank: (a, b) => a.rank - b.rank,
    imdb: (a, b) => b.imdb - a.imdb || a.rank - b.rank,
    short: (a, b) => a.hours - b.hours || a.rank - b.rank,
    long: (a, b) => b.hours - a.hours || a.rank - b.rank,
    new: (a, b) => b.start - a.start || a.rank - b.rank,
    old: (a, b) => a.start - b.start || a.rank - b.rank,
    recent: (a, b) => b.id.localeCompare(a.id),
    progress: (a, b) => (b.episode || 0) - (a.episode || 0) || a.rank - b.rank,
    az: (a, b) =>
      a.title
        .replace(/^The /i, "")
        .localeCompare(b.title.replace(/^The /i, "")),
    mine: (a, b) => {
      const rA = getMediaRecord(store, a.id).r || 0;
      const rB = getMediaRecord(store, b.id).r || 0;
      return rB - rA || a.rank - b.rank;
    },
  };

  return filtered.sort(sorters[filters.sort] || sorters.rank);
}

export function formatListForClipboard(store: Channel100Store): string {
  const getSection = (items: ChannelMediaItem[], label: string, key: "seen" | "watching" | "want") => {
    const list = items.filter((i) => getMediaRecord(store, i.id).s === key);
    if (!list.length) return "";
    return (
      `${label} (${list.length})\n` +
      list
        .map((i) => {
          const rec = getMediaRecord(store, i.id);
          const starsStr = rec.r ? " " + "★".repeat(rec.r) : "";
          const metaStr = i.kind === "tv" ? ` (${i.years})` : ` (${i.year}, ${i.director})`;
          return `${i.rank}. ${i.title}${metaStr}${starsStr} — ${i.where}`;
        })
        .join("\n")
    );
  };

  const getBlock = (k: "tv" | "film", heading: string) => {
    const items = CATALOGS[k].items;
    const parts = [
      getSection(items, "Seen", "seen"),
      getSection(items, "Watching", "watching"),
      getSection(items, "Want to see", "want"),
    ].filter(Boolean);
    return parts.length ? `== ${heading} ==\n` + parts.join("\n\n") : "";
  };

  const sections = [
    "My Channel 100 Entertainment Tracker",
    getBlock("tv", "TV Shows (NYT 100)"),
    getBlock("film", "Movies (NYT 100)"),
  ];

  if (store.custom && Object.keys(store.custom).length > 0) {
    const customItems = Object.values(store.custom);
    const customParts = [
      "== My Tracker (What I'm Watching) ==",
      ...customItems.map((c, i) => {
        const flag = c.langFlag || "🌐";
        const kind = c.kind.toUpperCase();
        const epStr = c.episode ? ` [Ep ${c.episode}${c.totalEpisodes ? `/${c.totalEpisodes}` : ""}]` : "";
        const starsStr = c.rating ? ` ${"★".repeat(c.rating)}` : "";
        const whereStr = c.where ? ` — ${c.where}` : "";
        const statusStr = c.status ? ` (${c.status.toUpperCase()})` : "";
        return `${i + 1}. ${flag} [${kind}] ${c.title}${epStr}${starsStr}${whereStr}${statusStr}`;
      }),
    ];
    sections.push(customParts.join("\n"));
  }

  return sections.filter(Boolean).join("\n\n");
}

export function exportBackup(store: Channel100Store): void {
  const blob = new Blob([JSON.stringify(store, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `channel100-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackup(
  jsonText: string
): { success: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonText);
    if (parsed && typeof parsed.shows === "object") {
      const validShows: Record<string, ShowUserRecord> = {};
      let count = 0;
      for (const [k, v] of Object.entries(parsed.shows)) {
        if ((k.startsWith("s") || k.startsWith("f") || k.startsWith("c_")) && v && typeof v === "object") {
          validShows[k] = v as ShowUserRecord;
          count++;
        }
      }

      const validCustom: Record<string, import("./types").CustomMediaItem> = {};
      if (parsed.custom && typeof parsed.custom === "object") {
        for (const [k, v] of Object.entries(parsed.custom)) {
          if (v && typeof v === "object") {
            validCustom[k] = v as import("./types").CustomMediaItem;
            count++;
          }
        }
      }

      const newStore: Channel100Store = {
        shows: validShows,
        custom: Object.keys(validCustom).length ? validCustom : undefined,
        updated: Date.now(),
      };
      saveStore(newStore);
      return { success: true, count };
    }
    return { success: false, count: 0, error: "Invalid backup format." };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Parse error";
    return { success: false, count: 0, error: message };
  }
}

