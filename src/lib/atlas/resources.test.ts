import { describe, expect, it } from "vitest";
import { hydrateStations } from "./validate";
import {
  applyStationResources,
  classifyResourceKind,
  pickStationResources,
  resourceSearchQuery,
  stationsNeedingResources,
} from "./resources";

describe("classifyResourceKind", () => {
  it("marks YouTube as video", () => {
    expect(classifyResourceKind("https://www.youtube.com/watch?v=abc")).toBe("video");
    expect(classifyResourceKind("https://youtu.be/abc")).toBe("video");
  });

  it("marks everything else as article", () => {
    expect(classifyResourceKind("https://example.com/k-and-r")).toBe("article");
  });
});

describe("pickStationResources", () => {
  it("caps at three and prefers a video plus articles when both exist", () => {
    const out = pickStationResources([
      { title: "Talk", href: "https://youtu.be/aaa" },
      { title: "Notes", href: "https://example.com/a" },
      { title: "More", href: "https://example.com/b" },
      { title: "Extra", href: "https://example.com/c" },
      { title: "Clip", href: "https://youtube.com/watch?v=bbb" },
    ]);
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ kind: "video", href: "https://youtu.be/aaa" });
    expect(out.slice(1).every((item) => item.kind === "article")).toBe(true);
  });

  it("skips non-https and duplicate hrefs", () => {
    const out = pickStationResources([
      { title: "Bad", href: "http://example.com/x" },
      { title: "  ", href: "https://example.com/ok" },
      { title: "One", href: "https://example.com/ok" },
      { title: "Two", href: "https://example.com/ok" },
    ]);
    expect(out).toEqual([{ title: "One", href: "https://example.com/ok", kind: "article" }]);
  });
});

describe("stationsNeedingResources", () => {
  it("skips stations that already have links", () => {
    const stations = hydrateStations([
      { id: "s1", weekId: "w1", title: "A", why: "x", estimatedMinutes: 20, energy: "DEEP", kind: "read", required: true },
      { id: "s2", weekId: "w1", title: "B", why: "y", estimatedMinutes: 20, energy: "SHALLOW", kind: "make", required: true },
    ]);
    stations[0]!.resources = [{ title: "Hit", href: "https://example.com/a", kind: "article" }];
    expect(stationsNeedingResources(stations).map((s) => s.id)).toEqual(["s2"]);
  });
});

describe("resourceSearchQuery", () => {
  it("joins cover, title, and why", () => {
    expect(resourceSearchQuery("Systems", { title: "Bytes", why: "Need size" })).toBe(
      "Systems: Bytes — Need size",
    );
  });
});

describe("applyStationResources", () => {
  it("writes resources onto one station and leaves others", () => {
    const syllabus = {
      thin: false,
      hoursPerWeek: 3.75,
      weeks: [{ id: "w1", label: "W1", estimatedMinutes: 40 }],
      stations: hydrateStations([
        { id: "s1", weekId: "w1", title: "A", why: "x", estimatedMinutes: 20, energy: "DEEP", kind: "read", required: true },
        { id: "s2", weekId: "w1", title: "B", why: "y", estimatedMinutes: 20, energy: "SHALLOW", kind: "make", required: true },
      ]),
    };
    const links = [{ title: "Hit", href: "https://example.com/a", kind: "article" as const }];
    const next = applyStationResources(syllabus, "s1", links);
    expect(next?.stations[0]?.resources).toEqual(links);
    expect(next?.stations[1]?.resources).toEqual([]);
    expect(applyStationResources(syllabus, "missing", links)).toBeNull();
  });
});
