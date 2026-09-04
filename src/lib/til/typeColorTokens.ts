/**
 * TIL type → theme color token. Distinct from TilFeedItem's TYPE_RAIL_COLOR
 * (pre-existing, hardcoded hex, predates the "no hex literals" rule this spec
 * adds) — this one is token-based so it reflows correctly across all five
 * themes, for use by any new Spectacle feature that needs to color a TIL
 * entry by type (Year Wall tiles now, Constellation satellites later).
 */

import type { TilType } from "@/db/schema";

export const TIL_TYPE_TOKEN: Record<TilType, string> = {
  FACT: "--cyan",
  GOTCHA: "--pink",
  SNIPPET: "--lime",
  PATTERN: "--violet",
  QUOTE: "--orange",
  OPINION: "--mint",
  LINK: "--yel",
  NEWS: "--orange",
};

export function tilTypeColorVar(type: TilType): string {
  return `var(${TIL_TYPE_TOKEN[type]})`;
}

export function tilTypeInitial(type: TilType): string {
  return type[0];
}
