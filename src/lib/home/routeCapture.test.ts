import { describe, expect, it } from "vitest";
import fixtures from "./__fixtures__/route-capture.json";
import { buildCaptureRequest, canCommitCapture, routeCapture } from "./routeCapture";

const TODAY = new Date("2024-01-15T12:00:00Z");
const TZ = "UTC";

describe("routeCapture — fixture suite", () => {
  it("has at least 30 cases", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(30);
  });

  for (const fixture of fixtures as {
    name: string;
    input: string;
    expected: Record<string, unknown>;
  }[]) {
    it(fixture.name, () => {
      const result = routeCapture(fixture.input, TODAY, TZ);

      for (const [key, value] of Object.entries(fixture.expected)) {
        expect(result[key as keyof typeof result]).toEqual(value);
      }
    });
  }
});

describe("routeCapture — Monday standup stays agenda", () => {
  it("does not treat Monday as a due date", () => {
    const result = routeCapture("plan the Monday standup", TODAY, TZ);

    expect(result.destination).toBe("agenda");
    expect(result.parsed?.dueOffsetDays).toBeNull();
  });
});

describe("routeCapture — preview shape", () => {
  it("leaves non-applicable fields null for an empty capture", () => {
    expect(routeCapture("", TODAY, TZ)).toEqual({
      destination: null,
      url: null,
      kind: null,
      host: null,
      body: null,
      text: null,
      chips: [],
      parsed: null,
      command: null,
      tilType: null,
      addedMinutes: null,
    });
  });
});

describe("canCommitCapture", () => {
  it("refuses empty slash commands and unknown tokens", () => {
    expect(canCommitCapture(routeCapture("/todo ", TODAY, TZ))).toBe(false);
    expect(canCommitCapture(routeCapture("/til ", TODAY, TZ))).toBe(false);
    expect(canCommitCapture(routeCapture("/nope hi", TODAY, TZ))).toBe(false);
  });

  it("accepts a locked command with a payload", () => {
    expect(canCommitCapture(routeCapture("/todo water the plants", TODAY, TZ))).toBe(true);
    expect(canCommitCapture(routeCapture("/til redis is single-threaded", TODAY, TZ))).toBe(true);
    expect(canCommitCapture(routeCapture("/bookmark https://example.com", TODAY, TZ))).toBe(true);
  });
});

describe("buildCaptureRequest", () => {
  it("builds a bookmark POST for a queue destination", () => {
    const preview = routeCapture("https://example.com/article", TODAY, TZ);
    expect(buildCaptureRequest(preview)).toEqual({
      url: "/api/bookmarks",
      body: { url: preview.url, ty: preview.kind, src: "Home capture" },
    });
  });

  it("builds a TIL POST for a record destination, defaulting tilType to FACT", () => {
    const preview = routeCapture("til redis is single-threaded", TODAY, TZ);
    expect(preview.tilType).toBeNull();
    expect(buildCaptureRequest(preview)).toEqual({
      url: "/api/til",
      body: { type: "FACT", body: preview.body },
    });
  });

  it("keeps an explicit tilType from a locked /til command", () => {
    const preview = routeCapture("/quote redis is single-threaded", TODAY, TZ);
    expect(buildCaptureRequest(preview)).toEqual({
      url: "/api/til",
      body: { type: preview.tilType, body: preview.body },
    });
  });

  it("builds a todo POST for an agenda destination", () => {
    const preview = routeCapture("water the plants", TODAY, TZ);
    expect(buildCaptureRequest(preview)).toEqual({
      url: "/api/todos",
      body: { text: preview.text },
    });
  });

  it("returns null for an empty capture with no destination", () => {
    expect(buildCaptureRequest(routeCapture("", TODAY, TZ))).toBeNull();
  });
});
