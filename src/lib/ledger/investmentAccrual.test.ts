import { describe, it, expect } from "vitest";
import {
  parseAccrualNotes,
  encodeAccrualNotes,
  mapAssetTypeToNetWorthCategory,
  computeDueAccrualPlan,
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

describe("computeDueAccrualPlan (cadence-aware accrual scheduling)", () => {
  // expectedReturnRate: 0 isolates contribution math from compound-growth math.
  const baseInv = {
    amount: 100,
    investmentDay: 1,
    currentValuation: 1000,
    expectedReturnRate: 0,
  };

  it("does not fire immediately for a brand-new DAILY schedule (starts counting from now)", () => {
    const inv = { ...baseInv, cadence: "DAILY" as const, notes: null };
    expect(computeDueAccrualPlan(inv, new Date("2026-08-31T12:00:00Z"))).toBeNull();
  });

  it("accrues DAILY once per elapsed day, catching up multiple missed days", () => {
    const notes = encodeAccrualNotes("", null, "2026-08-25T12:00:00.000Z");
    const inv = { ...baseInv, cadence: "DAILY" as const, notes };
    const plan = computeDueAccrualPlan(inv, new Date("2026-08-31T12:00:00Z")); // 6 days later
    expect(plan).not.toBeNull();
    expect(plan!.periods).toBe(6);
    expect(plan!.newValuation).toBe(1000 + 100 * 6);
  });

  it("does not accrue WEEKLY before a full 7-day period has elapsed", () => {
    const notes = encodeAccrualNotes("", null, "2026-08-25T12:00:00.000Z");
    const inv = { ...baseInv, cadence: "WEEKLY" as const, notes };
    expect(computeDueAccrualPlan(inv, new Date("2026-08-29T12:00:00Z"))).toBeNull(); // only 4 days
  });

  it("accrues WEEKLY once per elapsed 7-day period", () => {
    const notes = encodeAccrualNotes("", null, "2026-08-25T12:00:00.000Z");
    const inv = { ...baseInv, cadence: "WEEKLY" as const, notes };
    const plan = computeDueAccrualPlan(inv, new Date("2026-09-08T12:00:00Z")); // 14 days later
    expect(plan!.periods).toBe(2);
    expect(plan!.newValuation).toBe(1000 + 100 * 2);
  });

  it("accrues BIWEEKLY once per elapsed 14-day period", () => {
    const notes = encodeAccrualNotes("", null, "2026-08-01T12:00:00.000Z");
    const inv = { ...baseInv, cadence: "BIWEEKLY" as const, notes };
    const plan = computeDueAccrualPlan(inv, new Date("2026-08-30T12:00:00Z")); // 29 days later
    expect(plan!.periods).toBe(2); // floor(29 / 14)
  });

  it("MONTHLY: does not double-accrue within the same calendar month", () => {
    const notes = encodeAccrualNotes("", "2026-08", "2026-08-05T00:00:00.000Z");
    const inv = { ...baseInv, cadence: "MONTHLY" as const, notes };
    expect(computeDueAccrualPlan(inv, new Date(2026, 7, 20))).toBeNull();
  });

  it("MONTHLY: catches up multiple missed months once the day-of-month gate opens", () => {
    const notes = encodeAccrualNotes("", "2026-05", "2026-05-01T00:00:00.000Z");
    const inv = { ...baseInv, cadence: "MONTHLY" as const, investmentDay: 1, notes };
    const plan = computeDueAccrualPlan(inv, new Date(2026, 7, 15)); // August, 3 months later
    expect(plan!.periods).toBe(3);
    expect(plan!.newValuation).toBe(1000 + 100 * 3);
  });

  it("QUARTERLY: waits a full 3 calendar months before accruing again", () => {
    const notes = encodeAccrualNotes("", "2026-06", "2026-06-01T00:00:00.000Z");
    const inv = { ...baseInv, cadence: "QUARTERLY" as const, investmentDay: 1, notes };
    expect(computeDueAccrualPlan(inv, new Date(2026, 7, 15))).toBeNull(); // only 2 months
    const plan = computeDueAccrualPlan(inv, new Date(2026, 8, 15)); // 3 months later
    expect(plan!.periods).toBe(1);
  });

  it("ANNUAL: waits a full 12 calendar months before accruing again", () => {
    const notes = encodeAccrualNotes("", "2025-08", "2025-08-01T00:00:00.000Z");
    const inv = { ...baseInv, cadence: "ANNUAL" as const, investmentDay: 1, notes };
    expect(computeDueAccrualPlan(inv, new Date(2026, 6, 15))).toBeNull(); // 11 months
    const plan = computeDueAccrualPlan(inv, new Date(2026, 7, 15)); // 12 months later
    expect(plan!.periods).toBe(1);
  });

  it("a QUARTERLY investment is never accrued as if it were monthly", () => {
    // Guards against the historical bug where every cadence was treated as
    // "add the amount once per calendar month" regardless of its real cadence.
    const notes = encodeAccrualNotes("", "2026-06", "2026-06-01T00:00:00.000Z");
    const inv = { ...baseInv, cadence: "QUARTERLY" as const, investmentDay: 1, notes };
    const oneMonthLater = computeDueAccrualPlan(inv, new Date(2026, 6, 15));
    expect(oneMonthLater).toBeNull();
  });
});
