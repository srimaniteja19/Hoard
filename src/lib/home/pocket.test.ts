import { describe, expect, it } from "vitest";
import { currentPocket } from "./pocket";
import type { DayBlock } from "./types";

const blocks: DayBlock[] = [
  { start: "09:00", end: "09:30", title: "standup" },
  { start: "13:00", end: "14:00", title: "1:1" },
];

describe("currentPocket", () => {
  it("names the busy block and minutes left", () => {
    const pocket = currentPocket(blocks, new Date("2026-08-18T09:19:00"), 180);
    expect(pocket.state).toBe("busy");
    expect(pocket.blockTitle).toBe("standup");
    expect(pocket.minutesLeft).toBe(11);
    expect(pocket.line).toMatch(/standup/);
    expect(pocket.line).toMatch(/11m/);
  });

  it("describes a free pocket until the next block", () => {
    const pocket = currentPocket(blocks, new Date("2026-08-18T12:13:00"), 180);
    expect(pocket.state).toBe("free");
    expect(pocket.nextTitle).toBe("1:1");
    expect(pocket.minutesLeft).toBe(47);
    expect(pocket.line).toMatch(/47m until 1:1/);
  });

  it("calls late evening wind after the last block", () => {
    const pocket = currentPocket(blocks, new Date("2026-08-18T21:00:00"), 40);
    expect(pocket.state).toBe("wind");
    expect(pocket.line).toMatch(/Evening wind/);
  });

  it("falls back to open-day copy with no blocks in the afternoon", () => {
    const pocket = currentPocket([], new Date("2026-08-18T15:00:00"), 90);
    expect(pocket.state).toBe("free");
    expect(pocket.line).toMatch(/1h 30m free/);
  });
});
