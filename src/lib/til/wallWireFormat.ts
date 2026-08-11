/**
 * Compact wire format for the Year Wall aggregate (SPECTACLE.md §2).
 *
 * The DAL's WallDayAggregate[] shape is ergonomic but verbose on the wire —
 * repeating "loggedFor"/"count"/"dominantType" keys for up to 365 rows adds up.
 * This encodes to a date-keyed map of [count, typeCode] tuples instead, which
 * is what actually gets sent over HTTP. Pure, tested, framework-agnostic.
 */

import type { TilType } from "@/db/schema";
import type { WallDayAggregate } from "@/lib/dal/til";

export type WallWireFormat = Record<string, [count: number, typeCode: string]>;

const TYPE_TO_CODE: Record<TilType, string> = {
  FACT: "F",
  GOTCHA: "G",
  SNIPPET: "S",
  PATTERN: "P",
  QUOTE: "Q",
  OPINION: "O",
  LINK: "L",
};

const CODE_TO_TYPE: Record<string, TilType> = Object.fromEntries(
  Object.entries(TYPE_TO_CODE).map(([type, code]) => [code, type])
) as Record<string, TilType>;

export function encodeWallAggregate(days: WallDayAggregate[]): WallWireFormat {
  const wire: WallWireFormat = {};
  for (const day of days) {
    wire[day.loggedFor] = [day.count, TYPE_TO_CODE[day.dominantType]];
  }
  return wire;
}

export function decodeWallAggregate(wire: WallWireFormat): WallDayAggregate[] {
  return Object.entries(wire).map(([loggedFor, [count, typeCode]]) => ({
    loggedFor,
    count,
    dominantType: CODE_TO_TYPE[typeCode],
  }));
}
