import { describe, expect, it } from "vitest";
import { formatWire, fetchWire, wireFromAskMessage, wireItemsFromToolOutput } from "./askWire";

describe("wireItemsFromToolOutput", () => {
  it("reads ranked Perplexity hits and drops errors and dupes", () => {
    expect(
      wireItemsFromToolOutput({
        results: [
          { title: "SF weather", url: "https://weather.example/sf", snippet: "58°F", date: "2026-08-21" },
          { title: "dup", url: "https://weather.example/sf", snippet: "again" },
          { title: "no url", url: "", snippet: "skip" },
        ],
        id: "abc",
      })
    ).toEqual([
      {
        title: "SF weather",
        href: "https://weather.example/sf",
        snippet: "58°F",
        date: "2026-08-21",
      },
    ]);
    expect(wireItemsFromToolOutput({ error: "rate_limit", message: "slow down" })).toEqual([]);
  });
});

describe("formatWire", () => {
  it("marks a quiet wire and numbers live hits", () => {
    expect(formatWire([])).toContain("quiet");
    expect(
      formatWire([
        {
          title: "Heat advisory",
          href: "https://nws.example/sf",
          snippet: "High 92",
          date: "Thu",
        },
      ])
    ).toContain("Heat advisory (Thu)");
  });
});

describe("wireFromAskMessage", () => {
  it("reads data-wire parts", () => {
    const message = {
      id: "a",
      role: "assistant",
      parts: [
        {
          type: "data-wire",
          data: [
            { title: "News", href: "https://n.example", snippet: "headline", date: "" },
            { title: "News", href: "https://n.example", snippet: "dup" },
          ],
        },
      ],
    } as { parts: Array<{ type: string; data?: unknown }> };
    expect(wireFromAskMessage(message)).toEqual([
      { title: "News", href: "https://n.example", snippet: "headline", date: "" },
    ]);
  });
});

describe("fetchWire", () => {
  it("returns an empty list for a blank query and uses the search dep otherwise", async () => {
    expect(await fetchWire("  ")).toEqual([]);
    const hits = await fetchWire("sf weather", {
      search: async (query) => [
        { title: query, href: "https://w.example", snippet: "fog", date: "" },
      ],
    });
    expect(hits[0]?.title).toBe("sf weather");
  });
});
