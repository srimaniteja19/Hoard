import { describe, it, expect } from "vitest";
import { zonedTimeToUtc, getCompletedOnDate, localHHmm, remindAtOnDate } from "./todos";

describe("zonedTimeToUtc", () => {
  it("converts a Pacific-time wall clock to UTC (standard time, UTC-8)", () => {
    const result = zonedTimeToUtc("2024-01-15", "15:00", "America/Los_Angeles");
    expect(result.toISOString()).toBe("2024-01-15T23:00:00.000Z");
  });

  it("converts a Pacific-time wall clock to UTC (daylight time, UTC-7)", () => {
    const result = zonedTimeToUtc("2024-07-15", "15:00", "America/Los_Angeles");
    expect(result.toISOString()).toBe("2024-07-15T22:00:00.000Z");
  });

  it("is a no-op shift for UTC itself", () => {
    const result = zonedTimeToUtc("2024-01-15", "09:30", "UTC");
    expect(result.toISOString()).toBe("2024-01-15T09:30:00.000Z");
  });

  it("handles a positive offset zone", () => {
    const result = zonedTimeToUtc("2024-01-15", "09:00", "Asia/Tokyo"); // UTC+9
    expect(result.toISOString()).toBe("2024-01-15T00:00:00.000Z");
  });

  it("round-trips through getCompletedOnDate for the same instant", () => {
    const instant = zonedTimeToUtc("2024-01-15", "23:59", "America/Los_Angeles");
    expect(getCompletedOnDate("America/Los_Angeles", instant)).toBe("2024-01-15");
  });
});

describe("localHHmm / remindAtOnDate", () => {
  it("reads the wall-clock time in the given timezone", () => {
    const instant = zonedTimeToUtc("2024-01-15", "15:00", "America/Los_Angeles");
    expect(localHHmm(instant, "America/Los_Angeles")).toBe("15:00");
  });

  it("transplants a reminder onto a later date without shifting the local time", () => {
    const original = zonedTimeToUtc("2024-01-15", "09:30", "America/Los_Angeles");
    const moved = remindAtOnDate(original, "2024-01-16", "America/Los_Angeles");
    expect(localHHmm(moved, "America/Los_Angeles")).toBe("09:30");
    expect(getCompletedOnDate("America/Los_Angeles", moved)).toBe("2024-01-16");
  });

  it("survives a Pacific DST spring-forward when the local time exists on both days", () => {
    const original = zonedTimeToUtc("2024-03-09", "15:00", "America/Los_Angeles"); // before DST
    const moved = remindAtOnDate(original, "2024-03-11", "America/Los_Angeles"); // after DST
    expect(localHHmm(moved, "America/Los_Angeles")).toBe("15:00");
  });
});
