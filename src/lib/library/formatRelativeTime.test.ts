import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./formatRelativeTime";

describe("formatRelativeTime", () => {
  it("returns 'never' for null/undefined", () => {
    expect(formatRelativeTime(null)).toBe("never");
    expect(formatRelativeTime(undefined)).toBe("never");
  });

  it("returns 'now' for just-now timestamps", () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe("now");
  });

  it("formats minutes, hours, and days ago", () => {
    expect(formatRelativeTime(new Date(Date.now() - 5 * 60_000).toISOString())).toBe("5m ago");
    expect(formatRelativeTime(new Date(Date.now() - 3 * 3_600_000).toISOString())).toBe("3h ago");
    expect(formatRelativeTime(new Date(Date.now() - 2 * 86_400_000).toISOString())).toBe("2d ago");
  });
});
