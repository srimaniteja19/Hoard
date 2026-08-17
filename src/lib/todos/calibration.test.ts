import { describe, it, expect } from "vitest";
import { calibration, CalibrationSample } from "./calibration";

function samples(n: number, energy: CalibrationSample["energy"], ratio: number): CalibrationSample[] {
  return Array.from({ length: n }, () => ({
    estimated: 30,
    actual: Math.round(30 * ratio),
    energy,
  }));
}

describe("calibration — sample floors", () => {
  it("returns null overall below 30 samples", () => {
    const result = calibration(samples(29, "DEEP", 1.5));
    expect(result.overall).toBeNull();
  });

  it("returns a number at exactly 30 samples", () => {
    const result = calibration(samples(30, "DEEP", 1.5));
    expect(result.overall).toBe(1.5);
  });

  it("returns null for an energy class below 15 samples, even with 30+ overall", () => {
    const result = calibration([...samples(20, "DEEP", 1.5), ...samples(14, "SHALLOW", 1.0)]);
    expect(result.byEnergy.SHALLOW).toBeNull();
    expect(result.byEnergy.DEEP).toBe(1.5);
  });

  it("returns a number for an energy class at exactly 15 samples", () => {
    const result = calibration([...samples(15, "DEEP", 2.0), ...samples(15, "SHALLOW", 1.0)]);
    expect(result.byEnergy.DEEP).toBe(2.0);
  });

  it("reports every energy class as null when no samples exist for any of them", () => {
    const result = calibration([]);
    expect(result.overall).toBeNull();
    expect(result.byEnergy).toEqual({ DEEP: null, SHALLOW: null, ERRAND: null });
    expect(result.sampleCount).toBe(0);
  });
});

describe("calibration — multiplier math", () => {
  it("computes the mean of per-sample actual/estimated ratios", () => {
    const mixed: CalibrationSample[] = [
      ...Array.from({ length: 15 }, () => ({ estimated: 10, actual: 10, energy: "SHALLOW" as const })), // 1.0x
      ...Array.from({ length: 15 }, () => ({ estimated: 10, actual: 20, energy: "SHALLOW" as const })), // 2.0x
    ];
    const result = calibration(mixed);
    expect(result.overall).toBe(1.5);
  });

  it("sampleCount reflects usable samples across all energy classes", () => {
    const result = calibration([...samples(10, "DEEP", 1.2), ...samples(10, "SHALLOW", 1.2), ...samples(10, "ERRAND", 1.2)]);
    expect(result.sampleCount).toBe(30);
  });

  it("excludes zero/negative estimated or actual as unusable", () => {
    const bad: CalibrationSample[] = [{ estimated: 0, actual: 10, energy: "DEEP" }];
    const result = calibration([...bad, ...samples(30, "DEEP", 1.5)]);
    expect(result.sampleCount).toBe(30);
  });
});
