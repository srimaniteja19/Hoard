import { describe, it, expect } from "vitest";
import { formatCurrency, formatSignedCurrency, formatCompactCurrency } from "./formatters";

describe("Ledger Currency Formatters", () => {
  describe("formatCurrency", () => {
    it("correctly formats negative values placing minus sign before the dollar sign", () => {
      expect(formatCurrency(-150150.0)).toBe("-$150,150.00");
      expect(formatCurrency(-150150.0, 0)).toBe("-$150,150");
      expect(formatCurrency(-0.5)).toBe("-$0.50");
    });

    it("correctly formats positive values", () => {
      expect(formatCurrency(1747.74)).toBe("$1,747.74");
      expect(formatCurrency(28850, 0)).toBe("$28,850");
      expect(formatCurrency(179000, 0)).toBe("$179,000");
    });

    it("correctly formats zero and edge values", () => {
      expect(formatCurrency(0)).toBe("$0.00");
      expect(formatCurrency(0, 0)).toBe("$0");
      expect(formatCurrency(null as any)).toBe("$0.00");
      expect(formatCurrency(undefined as any)).toBe("$0.00");
    });
  });

  describe("formatSignedCurrency", () => {
    it("adds + sign for positive values", () => {
      expect(formatSignedCurrency(1200.5)).toBe("+$1,200.50");
    });

    it("adds - sign for negative values", () => {
      expect(formatSignedCurrency(-500.25)).toBe("-$500.25");
    });

    it("handles zero cleanly without signed indicator", () => {
      expect(formatSignedCurrency(0)).toBe("$0.00");
    });
  });

  describe("formatCompactCurrency", () => {
    it("formats compact representations", () => {
      expect(formatCompactCurrency(150150)).toBe("$150.2K");
      expect(formatCompactCurrency(-150150)).toBe("-$150.2K");
      expect(formatCompactCurrency(2500000)).toBe("$2.5M");
      expect(formatCompactCurrency(450)).toBe("$450");
    });

    it("formats Indian Rupee compact representations (Lakhs and Crores)", () => {
      expect(formatCompactCurrency(250000, "INR")).toBe("₹2.50 L");
      expect(formatCompactCurrency(15000000, "INR")).toBe("₹1.50 Cr");
      expect(formatCompactCurrency(5000, "INR")).toBe("₹5.0K");
    });
  });

  describe("multi-currency formatting", () => {
    it("formats INR currency correctly with Indian number grouping", () => {
      expect(formatCurrency(150000, 0, "INR")).toBe("₹1,50,000");
      expect(formatCurrency(-5000, 2, "INR")).toBe("-₹5,000.00");
    });

    it("formats EUR, GBP and other international currencies", () => {
      expect(formatCurrency(1200, 2, "EUR")).toBe("€1,200.00");
      expect(formatCurrency(450, 0, "GBP")).toBe("£450");
    });
  });
});
