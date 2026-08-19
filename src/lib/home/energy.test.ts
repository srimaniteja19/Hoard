import { describe, expect, it } from "vitest";
import { preferDeepWork, suggestedContext } from "./energy";
import { currentPocket } from "./pocket";

describe("suggestedContext", () => {
  it("suggests wind after 20:00", () => {
    const now = new Date("2026-08-18T21:00:00");
    const pocket = currentPocket([], now, 40);
    expect(suggestedContext(now, pocket)).toBe("wind");
  });

  it("suggests desk on a weekday morning", () => {
    const now = new Date("2026-08-18T08:30:00");
    const pocket = currentPocket([], now, 90);
    expect(suggestedContext(now, pocket)).toBe("desk");
  });

  it("stays all on a weekday afternoon", () => {
    const now = new Date("2026-08-18T15:00:00");
    const pocket = currentPocket([], now, 90);
    expect(suggestedContext(now, pocket)).toBe("all");
  });
});

describe("preferDeepWork", () => {
  it("is true for a weekday morning free pocket of 40m+", () => {
    const now = new Date("2026-08-18T08:30:00");
    const pocket = currentPocket([], now, 90);
    expect(preferDeepWork(now, pocket)).toBe(true);
  });

  it("is false in the evening", () => {
    const now = new Date("2026-08-18T21:00:00");
    const pocket = currentPocket([], now, 90);
    expect(preferDeepWork(now, pocket)).toBe(false);
  });
});
