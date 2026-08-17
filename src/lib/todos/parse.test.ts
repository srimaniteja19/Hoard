import { describe, it, expect } from "vitest";
import { parseTodo } from "./parse";
import fixtures from "./__fixtures__/parse.json";

// Fixed anchor: 2024-01-15T12:00:00Z is a Monday, in UTC — every fixture's
// expected weekday/recurrence/date-offset values are derived against this.
const TODAY = new Date("2024-01-15T12:00:00Z");
const TZ = "UTC";

describe("parseTodo — fixture suite", () => {
  it("has at least 40 cases", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(40);
  });

  for (const fixture of fixtures as { name: string; input: string; expected: Record<string, unknown> }[]) {
    it(fixture.name, () => {
      const result = parseTodo(fixture.input, TODAY, TZ);
      expect(result.title).toBe(fixture.expected.title);
      expect(result.estimatedMinutes).toBe(fixture.expected.estimatedMinutes);
      expect(result.energy).toBe(fixture.expected.energy);
      expect(result.dueOffsetDays).toBe(fixture.expected.dueOffsetDays);
      expect(result.remindAtLocal).toBe(fixture.expected.remindAtLocal);
      expect(result.recurrenceRule).toBe(fixture.expected.recurrenceRule);
      expect(result.tags).toEqual(fixture.expected.tags);
      expect(result.urgent).toBe(fixture.expected.urgent);
    });
  }
});

describe("parseTodo — matched tokens drive the live preview", () => {
  it("records every explicit token, not inferred defaults", () => {
    const result = parseTodo("Call the vet ~10m #errand", TODAY, TZ);
    // ~10m, #errand, and "call" (errand token) are explicit; nothing else
    // should appear since energy/estimate here are both explicit already.
    const fields = result.matched.map((m) => m.field).sort();
    expect(fields).toEqual(["energy", "estimatedMinutes", "tags"]);
  });

  it("records nothing when every field is inferred", () => {
    const result = parseTodo("Water the plants", TODAY, TZ);
    expect(result.matched).toEqual([]);
  });
});

describe("parseTodo — purity and independence", () => {
  it("does not mutate the input string or the today Date", () => {
    const input = "Call the vet tomorrow";
    const todayCopy = new Date(TODAY.getTime());
    parseTodo(input, TODAY, TZ);
    expect(input).toBe("Call the vet tomorrow");
    expect(TODAY.getTime()).toBe(todayCopy.getTime());
  });

  it("is deterministic for the same inputs", () => {
    const a = parseTodo("Renew passport tomorrow !!!", TODAY, TZ);
    const b = parseTodo("Renew passport tomorrow !!!", TODAY, TZ);
    expect(a).toEqual(b);
  });
});
