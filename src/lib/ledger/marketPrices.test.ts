import { describe, it, expect } from "vitest";
import { calculateMetalPriceBreakdown, TROY_OUNCE_GRAMS } from "./marketTypes";

describe("marketTypes - metal price calculations", () => {
  it("calculates Gold 24K per gram and per 10g accurately in USD and INR", () => {
    const spotUsd = 2500.0;
    const inrRate = 86.85;
    const breakdown = calculateMetalPriceBreakdown(spotUsd, inrRate, 1.25);

    expect(breakdown.pricePerOzUsd).toBe(2500);
    expect(breakdown.pricePerOzInr).toBe(Math.round(2500 * inrRate * 100) / 100);

    // Per gram = 2500 / 31.1034768 = ~80.38 USD
    expect(Math.abs(breakdown.pricePerGramUsd - 80.38)).toBeLessThan(0.1);

    // Per 10g in INR = ~69,807 INR
    expect(breakdown.pricePer10gInr).toBeGreaterThan(65000);
    expect(breakdown.pricePer10gInr).toBeLessThan(75000);
    expect(breakdown.change24hPct).toBe(1.25);
  });

  it("calculates Silver spot breakdown correctly", () => {
    const silverSpotUsd = 29.50;
    const inrRate = 86.85;
    const breakdown = calculateMetalPriceBreakdown(silverSpotUsd, inrRate, -0.5);

    expect(breakdown.pricePerOzUsd).toBe(29.5);
    expect(breakdown.pricePerGramUsd).toBeCloseTo(29.5 / TROY_OUNCE_GRAMS, 2);
    expect(breakdown.pricePerGramInr).toBeCloseTo((29.5 * inrRate) / TROY_OUNCE_GRAMS, 2);
  });
});
