import { describe, expect, it } from "vitest";
import { SKIP_TODAY_KEY, readSkippedIds, skipIdToday, type Kv } from "./skipToday";

function memory(initial: Record<string, string> = {}): Kv {
  const store = { ...initial };
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = value;
    },
  };
}

const WED = new Date("2026-08-18T16:00:00");

describe("skipToday", () => {
  it("returns [] when storage is empty or unreadable", () => {
    expect(readSkippedIds(memory(), WED)).toEqual([]);
    expect(
      readSkippedIds(
        memory({ [SKIP_TODAY_KEY]: "not-json" }),
        WED,
      ),
    ).toEqual([]);
  });

  it("ignores yesterday's skips", () => {
    const storage = memory({
      [SKIP_TODAY_KEY]: JSON.stringify({ date: "2026-08-17", ids: ["old"] }),
    });
    expect(readSkippedIds(storage, WED)).toEqual([]);
  });

  it("accumulates ids for the local day", () => {
    const storage = memory();
    expect(skipIdToday(storage, "a", WED)).toEqual(["a"]);
    expect(skipIdToday(storage, "b", WED)).toEqual(["a", "b"]);
    expect(skipIdToday(storage, "a", WED)).toEqual(["a", "b"]);
    expect(readSkippedIds(storage, WED)).toEqual(["a", "b"]);
  });
});
