import { describe, expect, it } from "vitest";
import { nextInStack, packWindow } from "./pack";
import type { LeadCandidate } from "./types";

function item(over: Partial<LeadCandidate> & Pick<LeadCandidate, "id" | "estimatedMinutes">): LeadCandidate {
  return {
    source: "todo",
    title: over.id,
    kind: null,
    energy: "SHALLOW",
    overdueDays: null,
    dueToday: false,
    rolloverCount: 0,
    ageDays: 1,
    unread: null,
    ...over,
  };
}

describe("packWindow", () => {
  it("returns an empty pack for an empty ranking", () => {
    expect(packWindow([], 45)).toEqual({
      lead: null,
      fits: true,
      stack: [],
      leftoverMinutes: 45,
    });
  });

  it("packs a greedy stack that never overfills", () => {
    const ranked = [
      item({ id: "a", estimatedMinutes: 20 }),
      item({ id: "b", estimatedMinutes: 25 }),
      item({ id: "c", estimatedMinutes: 10 }),
    ];
    const packed = packWindow(ranked, 35);
    expect(packed.lead?.id).toBe("a");
    expect(packed.fits).toBe(true);
    expect(packed.stack.map((c) => c.id)).toEqual(["c"]);
    expect(packed.leftoverMinutes).toBe(5);
  });

  it("marks a lead that does not fit and packs the rest into the full window", () => {
    const ranked = [
      item({ id: "big", estimatedMinutes: 90 }),
      item({ id: "small", estimatedMinutes: 15 }),
    ];
    const packed = packWindow(ranked, 30);
    expect(packed.lead?.id).toBe("big");
    expect(packed.fits).toBe(false);
    expect(packed.stack.map((c) => c.id)).toEqual(["small"]);
    expect(packed.leftoverMinutes).toBe(15);
  });

  it("at any-time (180) takes the next three without a leftover", () => {
    const ranked = [
      item({ id: "1", estimatedMinutes: 90 }),
      item({ id: "2", estimatedMinutes: 90 }),
      item({ id: "3", estimatedMinutes: 90 }),
      item({ id: "4", estimatedMinutes: 90 }),
      item({ id: "5", estimatedMinutes: 90 }),
    ];
    const packed = packWindow(ranked, 180);
    expect(packed.fits).toBe(true);
    expect(packed.stack.map((c) => c.id)).toEqual(["2", "3", "4"]);
    expect(packed.leftoverMinutes).toBeNull();
  });

  it("pins a stack item as the lead and packs the rest after it", () => {
    const ranked = [
      item({ id: "a", estimatedMinutes: 20 }),
      item({ id: "b", estimatedMinutes: 10 }),
      item({ id: "c", estimatedMinutes: 10 }),
    ];
    const packed = packWindow(ranked, 45, "c");
    expect(packed.lead?.id).toBe("c");
    expect(packed.stack.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("ignores a pin that is not in the ranking", () => {
    const ranked = [item({ id: "a", estimatedMinutes: 20 })];
    expect(packWindow(ranked, 45, "gone").lead?.id).toBe("a");
  });

  it("nextInStack is the first packed follower", () => {
    const packed = packWindow(
      [item({ id: "a", estimatedMinutes: 10 }), item({ id: "b", estimatedMinutes: 10 })],
      180,
    );
    expect(nextInStack(packed)).toBe("b");
    expect(nextInStack(packWindow([], 30))).toBeNull();
  });
});
