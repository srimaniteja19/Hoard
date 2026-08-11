import { describe, expect, it } from "vitest";
import { encodeWallAggregate, decodeWallAggregate } from "./wallWireFormat";
import type { WallDayAggregate } from "@/lib/dal/til";

describe("wall wire format", () => {
  const sample: WallDayAggregate[] = [
    { loggedFor: "2026-08-01", count: 3, dominantType: "FACT" },
    { loggedFor: "2026-08-02", count: 1, dominantType: "GOTCHA" },
    { loggedFor: "2026-08-03", count: 6, dominantType: "SNIPPET" },
    { loggedFor: "2026-08-04", count: 2, dominantType: "PATTERN" },
    { loggedFor: "2026-08-05", count: 4, dominantType: "QUOTE" },
    { loggedFor: "2026-08-06", count: 1, dominantType: "OPINION" },
    { loggedFor: "2026-08-07", count: 5, dominantType: "LINK" },
  ];

  it("round-trips every TIL type without loss", () => {
    const wire = encodeWallAggregate(sample);
    const decoded = decodeWallAggregate(wire);
    expect(decoded).toEqual(sample);
  });

  it("encodes to a compact date-keyed tuple, not a verbose object array", () => {
    const wire = encodeWallAggregate(sample);
    expect(wire["2026-08-01"]).toEqual([3, "F"]);
    expect(wire["2026-08-07"]).toEqual([5, "L"]);
  });

  it("produces a meaningfully smaller payload than the verbose shape", () => {
    const verbose = JSON.stringify(sample);
    const compact = JSON.stringify(encodeWallAggregate(sample));
    expect(compact.length).toBeLessThan(verbose.length);
  });

  it("handles an empty aggregate", () => {
    expect(encodeWallAggregate([])).toEqual({});
    expect(decodeWallAggregate({})).toEqual([]);
  });
});
