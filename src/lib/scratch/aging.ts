import { ScrapRow } from "@/db/schema";

export type ScrapAgeTier = "fresh" | "warm" | "cold" | "ancient";

const WARM_DAYS = 14; // matches the "going cold" threshold used in getScratchStats
const COLD_DAYS = 30;
const ANCIENT_DAYS = 60; // matches the "compost" threshold used in getScratchStats

/**
 * Coffee-ring aging only applies to scraps still sitting open on the Shelf —
 * logged entries, resolved/promoted items, and pinned notes are exempt.
 */
export function getScrapAgeTier(scrap: ScrapRow, now: Date = new Date()): ScrapAgeTier {
  if (scrap.kind === "LOG") return "fresh";
  if (scrap.status === "done") return "fresh";
  if (scrap.entities?.isPinned) return "fresh";

  const created = new Date(scrap.createdAt);
  const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

  if (days >= ANCIENT_DAYS) return "ancient";
  if (days >= COLD_DAYS) return "cold";
  if (days >= WARM_DAYS) return "warm";
  return "fresh";
}

/**
 * Deterministic 0-99 seed from a scrap id, used to place coffee-ring
 * blotches so they don't jitter position between renders.
 */
export function getRingSeed(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
}
