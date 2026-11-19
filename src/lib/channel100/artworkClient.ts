import { ChannelMediaItem } from "./types";

const ARTWORK_LS_KEY = "hoard.ch100.artwork.v3";
const LEGACY_ARTWORK_LS_KEYS = ["hoard.ch100.artwork.v1", "hoard.ch100.artwork.v2"];
const ARTWORK_API_VERSION = "2";
const MAX_CACHED_ENTRIES = 600;
const MAX_CONCURRENT = 6;

const memoryCache = new Map<string, string | null>();
const inFlight = new Map<string, Promise<string | null>>();

let lsLoaded = false;
let activeCount = 0;
const queue: Array<() => void> = [];

function ensureLsLoaded() {
  if (lsLoaded || typeof window === "undefined") return;
  lsLoaded = true;
  try {
    // Clean up legacy caches
    LEGACY_ARTWORK_LS_KEYS.forEach((k) => localStorage.removeItem(k));
    const raw = localStorage.getItem(ARTWORK_LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, string | null>;
    if (parsed && typeof parsed === "object") {
      Object.entries(parsed).forEach(([k, v]) => {
        if (typeof v === "string" && v.startsWith("http")) {
          memoryCache.set(k, v);
        }
      });
    }
  } catch {
    // ignore malformed localStorage cache
  }
}

function persistLs() {
  if (typeof window === "undefined") return;
  try {
    // Only persist confirmed image URLs; never persist null misses
    const validEntries = Array.from(memoryCache.entries())
      .filter(([, v]) => typeof v === "string" && v.startsWith("http"))
      .slice(-MAX_CACHED_ENTRIES);
    localStorage.setItem(ARTWORK_LS_KEY, JSON.stringify(Object.fromEntries(validEntries)));
  } catch {
    // ignore quota errors
  }
}

function runWithLimit<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      activeCount++;
      task()
        .then(resolve, reject)
        .finally(() => {
          activeCount--;
          const next = queue.shift();
          if (next) next();
        });
    };
    if (activeCount < MAX_CONCURRENT) {
      run();
    } else {
      queue.push(run);
    }
  });
}

export function getArtworkCacheKey(item: Pick<ChannelMediaItem, "id" | "title" | "kind" | "customKind" | "year" | "start">): string {
  const effectiveKind =
    item.customKind === "tv" || item.customKind === "anime" || item.customKind === "mini" || item.kind === "tv"
      ? "tv"
      : "film";
  const yr = item.year || item.start || "";
  return `${effectiveKind}:${item.title.toLowerCase().trim()}:${yr}`;
}

export function getCachedArtwork(item: ChannelMediaItem): string | null | undefined {
  if (item.image) return item.image;
  ensureLsLoaded();
  return memoryCache.get(getArtworkCacheKey(item));
}

export async function fetchItemArtwork(item: ChannelMediaItem): Promise<string | null> {
  if (item.image) return item.image;
  ensureLsLoaded();

  const key = getArtworkCacheKey(item);
  if (memoryCache.has(key)) {
    return memoryCache.get(key) ?? null;
  }

  const existing = inFlight.get(key);
  if (existing) return existing;

  const effectiveKind =
    item.customKind === "tv" || item.customKind === "anime" || item.customKind === "mini" || item.kind === "tv"
      ? "tv"
      : "film";
  const yr = item.year || item.start || "";

  const promise = runWithLimit(async () => {
    try {
      const qs = new URLSearchParams({
        title: item.title,
        kind: effectiveKind,
        v: ARTWORK_API_VERSION,
        ...(yr ? { year: String(yr) } : {}),
      });
      const res = await fetch(`/api/channel100/artwork?${qs.toString()}`);
      if (!res.ok) {
        return null;
      }
      const data = await res.json();
      const img = typeof data?.image === "string" && data.image.startsWith("http") ? data.image : null;
      if (img) {
        memoryCache.set(key, img);
        persistLs();
      }
      return img;
    } catch {
      return null;
    } finally {
      inFlight.delete(key);
    }
  });

  inFlight.set(key, promise);
  return promise;
}
