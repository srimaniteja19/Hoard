import { describe, it, expect, vi } from "vitest";
import {
  convertToUsd,
  convertFromUsd,
  getFxSnapshotSync,
  FALLBACK_FX_RATES,
} from "./fx";

describe("Real-time FX Currency Converter", () => {
  it("converts INR to USD correctly", () => {
    // ₹86.85 should be ~$1.00 USD
    const usd = convertToUsd(86.85, "INR", 86.85);
    expect(usd).toBe(1.00);

    // ₹31,476.83 at 86.85 should be ~$362.43 USD
    const sipUsd = convertToUsd(31476.83, "INR", 86.85);
    expect(sipUsd).toBe(362.43);
  });

  it("handles USD with zero conversion change", () => {
    expect(convertToUsd(100, "USD")).toBe(100);
    expect(convertToUsd(0, "USD")).toBe(0);
    expect(convertToUsd(null, "USD")).toBe(0);
  });

  it("converts USD to INR accurately", () => {
    const inr = convertFromUsd(362.43, "INR", 86.85);
    expect(Math.round(inr)).toBe(31477);
  });

  it("returns FX snapshot with current date and rate metadata", () => {
    const snapshot = getFxSnapshotSync();
    expect(snapshot.base).toBe("USD");
    expect(snapshot.inrPerUsd).toBeGreaterThan(50);
    expect(snapshot.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(snapshot.formattedDate).toBeTruthy();
    expect(typeof snapshot.isLive).toBe("boolean");
  });

  it("warns and passes the amount through unconverted for an unrecognized currency", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(convertToUsd(100, "CHF")).toBe(100);
    expect(convertFromUsd(100, "CHF")).toBe(100);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });
});
