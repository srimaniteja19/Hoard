import { describe, expect, it } from "vitest";
import { extractComplete } from "./partial";

describe("extractComplete", () => {
  it("ignores stations missing why or minutes", () => {
    const out = extractComplete({
      title: "Systems",
      brief: "JS to the metal",
      weeks: [{ id: "w1", label: "Foundations", estimatedMinutes: 0 }],
      stations: [
        { id: "s1", weekId: "w1", title: "Bytes", why: "Need size", estimatedMinutes: 20, energy: "DEEP", kind: "read", required: true },
        { id: "s2", weekId: "w1", title: "Half" },
      ],
    });
    expect(out.title).toBe("Systems");
    expect(out.weeks).toHaveLength(1);
    expect(out.stations.map((s) => s.id)).toEqual(["s1"]);
  });

  it("ignores weeks missing id or label", () => {
    const out = extractComplete({
      weeks: [{ id: "w1" }, { label: "Solo" }, { id: "w2", label: "OK" }],
      stations: [],
    });
    expect(out.weeks.map((w) => w.id)).toEqual(["w2"]);
  });

  it("defaults required to true when missing", () => {
    const out = extractComplete({
      stations: [
        { id: "s1", weekId: "w1", title: "Bytes", why: "Need size", estimatedMinutes: 20, energy: "DEEP", kind: "read" },
      ],
    });
    expect(out.stations[0]?.required).toBe(true);
  });

  it("returns empty collections for non-objects", () => {
    expect(extractComplete(null)).toEqual({ weeks: [], stations: [] });
    expect(extractComplete("nope")).toEqual({ weeks: [], stations: [] });
  });
});
