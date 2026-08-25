import { ScrapRow } from "@/db/schema";

const BOARD_WIDTH = 2000;
const BOARD_HEIGHT = 1200;
const CARD_MARGIN = 40;

/**
 * Resolves a pinned scrap's position on the corkboard canvas: its stored
 * boardX/boardY if both are set, otherwise a deterministic scattered
 * fallback derived from a hash of its id so repeat visits don't jitter
 * and first-time pins aren't all stacked at the origin.
 */
export function getBoardPosition(scrap: ScrapRow, index: number): { x: number; y: number } {
  const { boardX, boardY } = scrap.entities || {};
  if (typeof boardX === "number" && typeof boardY === "number") {
    return { x: boardX, y: boardY };
  }

  const seed = `${scrap.id}:${index}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  const usableWidth = BOARD_WIDTH - CARD_MARGIN * 2;
  const usableHeight = BOARD_HEIGHT - CARD_MARGIN * 2;

  return {
    x: CARD_MARGIN + (hash % usableWidth),
    y: CARD_MARGIN + (((hash >>> 8) % usableHeight)),
  };
}

/**
 * Derives red-string pairs from existing weld data: a scrap's weldedToId
 * points at the scrap it was welded onto. Only pairs where BOTH scraps
 * are currently pinned (and therefore both on the board) are returned.
 */
export function getWeldConnections(scraps: ScrapRow[]): Array<{ from: string; to: string }> {
  const pinnedIds = new Set(
    scraps.filter((s) => Boolean(s.entities?.isPinned)).map((s) => s.id)
  );

  const connections: Array<{ from: string; to: string }> = [];
  for (const scrap of scraps) {
    if (!scrap.weldedToId) continue;
    if (!pinnedIds.has(scrap.id)) continue;
    if (!pinnedIds.has(scrap.weldedToId)) continue;
    connections.push({ from: scrap.id, to: scrap.weldedToId });
  }
  return connections;
}
