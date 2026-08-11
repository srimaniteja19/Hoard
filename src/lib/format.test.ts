import { describe, it, expect } from "vitest";
import { formatDuration } from "./format";

describe("formatDuration", () => {
  it("formats minute durations under an hour", () => {
    expect(formatDuration(0)).toBe("0 MIN");
    expect(formatDuration(15)).toBe("15 MIN");
    expect(formatDuration(45)).toBe("45 MIN");
    expect(formatDuration(59)).toBe("59 MIN");
  });

  it("formats minute durations over an hour with remainder", () => {
    expect(formatDuration(61)).toBe("1H 1M");
    expect(formatDuration(141)).toBe("2H 21M");
    expect(formatDuration(365)).toBe("6H 5M");
  });

  it("formats exact hour durations without 0M suffix", () => {
    expect(formatDuration(60)).toBe("1H");
    expect(formatDuration(120)).toBe("2H");
    expect(formatDuration(600)).toBe("10H");
  });

  it("handles decimal and invalid values gracefully", () => {
    expect(formatDuration(44.8)).toBe("45 MIN");
    expect(formatDuration(-10)).toBe("0 MIN");
  });
});
