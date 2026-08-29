import { describe, it, expect } from "vitest";
import {
  parseAccrualNotes,
  encodeAccrualNotes,
  mapAssetTypeToNetWorthCategory,
} from "./investmentAccrual";

describe("Investment Accrual Engine", () => {
  it("encodes and parses accrual metadata accurately", () => {
    const rawNote = "Groww direct mutual fund";
    const encoded = encodeAccrualNotes(rawNote, "2026-08", "2026-08-20T10:00:00.000Z");

    expect(encoded).toContain(rawNote);
    expect(encoded).toContain("[accrual:");

    const parsed = parseAccrualNotes(encoded);
    expect(parsed.userNote).toBe(rawNote);
    expect(parsed.lastAccruedMonth).toBe("2026-08");
    expect(parsed.lastExecutedAt).toBe("2026-08-20T10:00:00.000Z");
  });

  it("handles plain notes without metadata gracefully", () => {
    const parsed = parseAccrualNotes("Regular note with no tags");
    expect(parsed.userNote).toBe("Regular note with no tags");
    expect(parsed.lastAccruedMonth).toBeNull();
    expect(parsed.lastExecutedAt).toBeNull();
  });

  it("maps investment asset types to correct Net Worth categories", () => {
    expect(mapAssetTypeToNetWorthCategory("GOLD_PRECIOUS_METALS")).toBe("INVESTMENT");
    expect(mapAssetTypeToNetWorthCategory("STOCKS_ETF")).toBe("INVESTMENT");
    expect(mapAssetTypeToNetWorthCategory("MUTUAL_FUND")).toBe("INVESTMENT");
    expect(mapAssetTypeToNetWorthCategory("CRYPTO")).toBe("CRYPTO");
    expect(mapAssetTypeToNetWorthCategory("RETIREMENT")).toBe("RETIREMENT");
    expect(mapAssetTypeToNetWorthCategory("REAL_ESTATE_REIT")).toBe("REAL_ESTATE");
  });
});
