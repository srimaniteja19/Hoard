import { describe, expect, it } from "vitest";
import { composeAskTicket, splitDeckItem } from "./askTicket";

const answer = `## Summary
Skip the model internals until you've shipped something that breaks in production.

## Why
The path from a notebook to a failing user is the only curriculum that sticks.

1. **Ship a thin loop.** A single eval, a single user, a single break.
2. **Read the traces.** Tokens and tools, not blog posts.
3. **Add the missing piece.** Only after the break names it.
4. **Measure the recovery.** Time-to-fix is the lesson.
5. **Then read the paper.** Now the internals have a job.

| Metric | Value |
| --- | --- |
| Breaks | 6 |
| Fixes | 6 |
| Papers | 1 |
`;

describe("composeAskTicket", () => {
  it("puts the summary on the ticket and encodes the block array", () => {
    const ticket = composeAskTicket({
      question: "give me an AI engineering learning plan, what to learn first and next, and skip the fluff",
      answer,
      summary: "Skip the model internals until you've shipped something that breaks in production.",
      citations: [],
      createdAt: "2026-08-21T18:00:00",
    });
    expect(ticket.thesis).toMatch(/Skip the model internals/i);
    expect(ticket.asked.startsWith("give me an AI engineering")).toBe(true);
    expect(ticket.spine).toBe("yel");
    expect(ticket.glyphs.map((glyph) => glyph.kind)).toEqual(["prose", "deck", "stats", "weight"]);
    expect(ticket.cards).toHaveLength(5);
    expect(ticket.cards[0]?.title).toBe("Ship a thin loop.");
    expect(ticket.stamp).toBe("21 AUG");
  });

  it("marks a citation-heavy write-up as research pink", () => {
    const ticket = composeAskTicket({
      question: "why SSDs",
      answer: "## Summary\nThe bus was the bottleneck.\n\nThermals killed the pitch.",
      citations: [
        { title: "one" },
        { title: "two" },
        { title: "three" },
      ],
      createdAt: "2026-08-20T12:00:00",
    });
    expect(ticket.spine).toBe("pink");
    expect(ticket.glyphs.some((glyph) => glyph.kind === "prose")).toBe(true);
  });
});

describe("splitDeckItem", () => {
  it("lifts a bold lead as the card title", () => {
    expect(splitDeckItem("**Silent RSVP.** A calendar hold with no note attached.")).toEqual({
      title: "Silent RSVP.",
      body: "A calendar hold with no note attached.",
    });
  });
});
