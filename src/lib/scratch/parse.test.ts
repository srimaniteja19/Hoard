import { describe, it, expect } from "vitest";
import { parseSlabText, extractKeywords, formatScrapDayHeader, getDeterministicTilt } from "./parse";

describe("parseSlabText", () => {
  it("parses empty string as ghost FRAGMENT", () => {
    const res = parseSlabText("");
    expect(res.isGhost).toBe(true);
    expect(res.kind).toBe("FRAGMENT");
    expect(res.wordCount).toBe(0);
  });

  it("detects QUESTION from prefix or suffix ?", () => {
    const q1 = parseSlabText("? Is invisible state real");
    expect(q1.kind).toBe("QUESTION");
    expect(q1.color).toBe("violet");
    expect(q1.chips.some((c) => c.label === "STAYS OPEN UNTIL ANSWERED")).toBe(true);

    const q2 = parseSlabText("Why does this fail?");
    expect(q2.kind).toBe("QUESTION");
  });

  it("detects QUOTE from >", () => {
    const res = parseSlabText("> A distributed system is one where a machine you never heard of can break yours.");
    expect(res.kind).toBe("QUOTE");
    expect(res.color).toBe("yellow");
  });

  it("detects ACTION from → or ->", () => {
    const a1 = parseSlabText("→ Try rendering with isolation: isolate");
    expect(a1.kind).toBe("ACTION");
    expect(a1.color).toBe("lime");
    expect(a1.chips.some((c) => c.label === "WILL OFFER AS A TODO")).toBe(true);

    const a2 = parseSlabText("-> Fix database query");
    expect(a2.kind).toBe("ACTION");
  });

  it("detects RANT from !!", () => {
    const res = parseSlabText("!! Every weekly review congratulates me without substance.");
    expect(res.kind).toBe("RANT");
    expect(res.color).toBe("pink");
  });

  it("detects IDEA for longer fragments (>22 words)", () => {
    const text =
      "Wear as a data encoding in our interface where a card you opened forty times looks handled with dog ear edges and subtle grime over time.";
    const res = parseSlabText(text);
    expect(res.kind).toBe("IDEA");
  });

  it("extracts tags", () => {
    const res = parseSlabText("Fix the border styling on the card #css #design");
    expect(res.tags).toEqual(["#css", "#design"]);
    expect(res.chips.some((c) => c.type === "tag" && c.label === "#css")).toBe(true);
  });

  it("produces deterministic tilt", () => {
    const t1 = getDeterministicTilt("hello world");
    const t2 = getDeterministicTilt("hello world");
    expect(t1).toBe(t2);
  });
});

describe("extractKeywords", () => {
  it("filters out stop words and short words (< 4 chars)", () => {
    const words = extractKeywords("The quick brown foxes are running through the transaction boundaries");
    expect(words).toContain("quick");
    expect(words).toContain("brown");
    expect(words).toContain("foxes");
    expect(words).toContain("running");
    expect(words).toContain("transaction");
    expect(words).toContain("boundaries");
    expect(words).not.toContain("the");
    expect(words).not.toContain("are");
  });
});

describe("formatScrapDayHeader", () => {
  it("formats today and yesterday correctly", () => {
    expect(formatScrapDayHeader("2026-08-23", "2026-08-23", "2026-08-22")).toBe("TODAY · 23 AUG");
    expect(formatScrapDayHeader("2026-08-22", "2026-08-23", "2026-08-22")).toBe("YESTERDAY");
    expect(formatScrapDayHeader("2026-08-15", "2026-08-23", "2026-08-22")).toBe("15 AUG");
  });
});
