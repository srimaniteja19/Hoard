import { describe, it, expect } from "vitest";
import { pageLabelFromPath } from "./chrome";

describe("pageLabelFromPath", () => {
  it("labels the signed-in app routes", () => {
    expect(pageLabelFromPath("/")).toBe("HOME");
    expect(pageLabelFromPath("/library")).toBe("LIBRARY");
    expect(pageLabelFromPath("/library/ask")).toBe("ASK");
    expect(pageLabelFromPath("/todos")).toBe("TODOS");
    expect(pageLabelFromPath("/todos/history")).toBe("HISTORY");
    expect(pageLabelFromPath("/til")).toBe("TIL");
    expect(pageLabelFromPath("/stats")).toBe("STATS");
    expect(pageLabelFromPath("/settings")).toBe("SETTINGS");
  });

  it("treats nested paths as their parent section", () => {
    expect(pageLabelFromPath("/library/foo")).toBe("LIBRARY");
    expect(pageLabelFromPath("/til?view=codex".split("?")[0])).toBe("TIL");
    expect(pageLabelFromPath("/todos/history/extra")).toBe("HISTORY");
  });

  it("ignores trailing slashes", () => {
    expect(pageLabelFromPath("/library/")).toBe("LIBRARY");
    expect(pageLabelFromPath("/todos/history/")).toBe("HISTORY");
  });

  it("falls back for unknown paths", () => {
    expect(pageLabelFromPath("/login")).toBe("HOARD");
    expect(pageLabelFromPath("/share/abc")).toBe("HOARD");
    expect(pageLabelFromPath("/session")).toBe("HOARD");
  });
});
