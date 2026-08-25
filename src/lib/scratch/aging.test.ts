import { describe, it, expect } from "vitest";
import { getScrapAgeTier, getRingSeed } from "./aging";
import { ScrapRow } from "@/db/schema";

function mockScrap(partial: Partial<ScrapRow>): ScrapRow {
  return {
    id: "s1",
    userId: "u1",
    content: "Sample content",
    kind: "FRAGMENT",
    color: "cyan",
    tilt: "0deg",
    notes: "",
    status: "raw",
    statusLabel: "RAW",
    promotedTo: null,
    promotedId: null,
    threadN: 0,
    threadSummary: null,
    weldedToId: null,
    loggedFor: "2026-08-23",
    occurredOn: "2026-08-23",
    entities: {},
    tags: [],
    isBuried: false,
    buriedAt: null,
    createdAt: new Date("2026-08-23T10:00:00Z"),
    updatedAt: new Date("2026-08-23T10:00:00Z"),
    ...partial,
  };
}

const NOW = new Date("2026-08-25T00:00:00Z");

describe("getScrapAgeTier", () => {
  it("returns fresh for scraps under 14 days old", () => {
    const scrap = mockScrap({ createdAt: new Date("2026-08-20T00:00:00Z") });
    expect(getScrapAgeTier(scrap, NOW)).toBe("fresh");
  });

  it("returns warm at the 14 day going-cold threshold", () => {
    const scrap = mockScrap({ createdAt: new Date("2026-08-10T00:00:00Z") });
    expect(getScrapAgeTier(scrap, NOW)).toBe("warm");
  });

  it("returns cold between 30 and 59 days", () => {
    const scrap = mockScrap({ createdAt: new Date("2026-07-20T00:00:00Z") });
    expect(getScrapAgeTier(scrap, NOW)).toBe("cold");
  });

  it("returns ancient at the 60 day compost threshold", () => {
    const scrap = mockScrap({ createdAt: new Date("2026-06-01T00:00:00Z") });
    expect(getScrapAgeTier(scrap, NOW)).toBe("ancient");
  });

  it("never ages a LOG scrap", () => {
    const scrap = mockScrap({ kind: "LOG", createdAt: new Date("2026-01-01T00:00:00Z") });
    expect(getScrapAgeTier(scrap, NOW)).toBe("fresh");
  });

  it("never ages a resolved scrap", () => {
    const scrap = mockScrap({ status: "done", createdAt: new Date("2026-01-01T00:00:00Z") });
    expect(getScrapAgeTier(scrap, NOW)).toBe("fresh");
  });

  it("never ages a pinned scrap", () => {
    const scrap = mockScrap({
      entities: { isPinned: true },
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    expect(getScrapAgeTier(scrap, NOW)).toBe("fresh");
  });
});

describe("getRingSeed", () => {
  it("is deterministic for the same scrap id", () => {
    expect(getRingSeed("abc-123")).toBe(getRingSeed("abc-123"));
  });

  it("varies across different ids", () => {
    expect(getRingSeed("abc-123")).not.toBe(getRingSeed("xyz-789"));
  });
});
