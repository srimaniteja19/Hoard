import { describe, it, expect } from "vitest";
import { extractAllTags, filterScraps, generateMonthCalendar } from "./filters";
import { ScrapRow } from "@/db/schema";

function mockScrap(partial: Partial<ScrapRow>): ScrapRow {
  return {
    id: "s1",
    userId: "u1",
    content: "Sample content",
    kind: "FRAGMENT",
    color: "cyan",
    tilt: "0deg",
    notes: "",
    status: "raw",
    statusLabel: "RAW",
    promotedTo: null,
    promotedId: null,
    threadN: 0,
    threadSummary: null,
    weldedToId: null,
    loggedFor: "2026-08-23",
    occurredOn: "2026-08-23",
    entities: {},
    tags: [],
    isBuried: false,
    buriedAt: null,
    createdAt: new Date("2026-08-23T10:00:00Z"),
    updatedAt: new Date("2026-08-23T10:00:00Z"),
    ...partial,
  };
}

describe("Scratch filters and calendar", () => {
  it("extracts unique tags across content and notes with frequency counts", () => {
    const scraps: ScrapRow[] = [
      mockScrap({ content: "Explore #ai and #agents" }),
      mockScrap({ content: "Another #ai thought", notes: "Related to #architecture" }),
      mockScrap({ content: "Plain note without tags" }),
    ];

    const tags = extractAllTags(scraps);
    expect(tags).toEqual([
      { tag: "#ai", count: 2 },
      { tag: "#agents", count: 1 },
      { tag: "#architecture", count: 1 },
    ]);
  });

  it("filters scraps by search query", () => {
    const scraps: ScrapRow[] = [
      mockScrap({ id: "1", content: "Postgres vector embeddings" }),
      mockScrap({ id: "2", content: "Redis caching layer", notes: "Fast memory access" }),
      mockScrap({ id: "3", content: "CSS neo-brutalist styling" }),
    ];

    const results = filterScraps(scraps, { query: "redis memory" });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("2");
  });

  it("filters scraps by kind category", () => {
    const scraps: ScrapRow[] = [
      mockScrap({ id: "1", kind: "QUESTION", content: "? Why does it work" }),
      mockScrap({ id: "2", kind: "IDEA", content: "New feature proposal" }),
      mockScrap({ id: "3", kind: "ACTION", content: "→ Fix this bug" }),
    ];

    const questions = filterScraps(scraps, { query: "", kind: "QUESTION" });
    expect(questions.length).toBe(1);
    expect(questions[0].id).toBe("1");
  });

  it("filters scraps by status", () => {
    const scraps: ScrapRow[] = [
      mockScrap({ id: "1", notes: "Has some detailed notes" }),
      mockScrap({ id: "2", notes: "" }),
      mockScrap({ id: "3", content: "![screenshot](/api/scratch/assets/1)" }),
    ];

    const withNotes = filterScraps(scraps, { query: "", status: "has_notes" });
    expect(withNotes.length).toBe(1);
    expect(withNotes[0].id).toBe("1");

    const withImages = filterScraps(scraps, { query: "", status: "images" });
    expect(withImages.length).toBe(1);
    expect(withImages[0].id).toBe("3");
  });

  it("generates a 42-cell calendar matrix for a month", () => {
    const scraps: ScrapRow[] = [
      mockScrap({ loggedFor: "2026-08-15", kind: "IDEA" }),
      mockScrap({ loggedFor: "2026-08-15", kind: "QUESTION" }),
      mockScrap({ loggedFor: "2026-08-23", kind: "FRAGMENT" }),
    ];

    const calendar = generateMonthCalendar(scraps, 2026, 7, "2026-08-23", "2026-08-23");
    expect(calendar.days.length).toBe(42);
    expect(calendar.monthName).toBe("AUGUST");
    expect(calendar.totalScrapsInMonth).toBe(3);

    const day15 = calendar.days.find((d) => d.dateIso === "2026-08-15");
    expect(day15).toBeDefined();
    expect(day15?.scrapCount).toBe(2);
    expect(day15?.kinds).toContain("IDEA");
    expect(day15?.kinds).toContain("QUESTION");

    const day23 = calendar.days.find((d) => d.dateIso === "2026-08-23");
    expect(day23?.isToday).toBe(true);
    expect(day23?.isSelected).toBe(true);
    expect(day23?.scrapCount).toBe(1);
  });
});
