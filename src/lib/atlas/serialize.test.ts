import { describe, expect, it } from "vitest";
import { serializeAtlas } from "./serialize";

describe("serializeAtlas", () => {
  it("maps snake row to AtlasRecord", () => {
    const row = {
      id: "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
      userId: "u",
      serial: "ATL-A1B2",
      title: "Systems",
      brief: "JS to the metal",
      prompt: "systems from JS",
      depth: "working",
      cadence: "weeknights",
      minutesPerSession: 45,
      weeksPlanned: 4,
      antiScope: ["leetcode"],
      status: "draft",
      currentWeekId: null,
      syllabus: { thin: false, hoursPerWeek: 3.75, weeks: [], stations: [] },
      model: "x",
      createdAt: new Date("2026-08-21T00:00:00.000Z"),
      updatedAt: new Date("2026-08-21T00:00:00.000Z"),
    };
    expect(serializeAtlas(row as never).serial).toBe("ATL-A1B2");
    expect(serializeAtlas(row as never).createdAt).toBe("2026-08-21T00:00:00.000Z");
  });
});
