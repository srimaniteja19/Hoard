import { describe, expect, it } from "vitest";
import type { AskUIMessage } from "./askLibrary";
import {
  buildAskSave,
  citationsFromAskMessage,
  createAskSaveSchema,
  displayKeptTitle,
  filterKeptStamps,
  groupKeptByDay,
  keptDayLabel,
  needsKeptTitle,
  questionForAssistantTurn,
  snippetKeptTitle,
} from "./askSave";

const tilCite = {
  ownerType: "til" as const,
  ownerId: "abc",
  title: "SSD note",
  href: "/til?hash=abcd",
  kind: "LINK",
};

describe("citationsFromAskMessage", () => {
  it("dedupes shelf hits and drops incomplete ones", () => {
    const message = {
      id: "a",
      role: "assistant",
      parts: [
        {
          type: "data-shelf",
          data: [
            tilCite,
            { ...tilCite, title: "dup" },
            { ownerType: "bookmark", ownerId: "12", title: "", href: "https://x.com", kind: "ART" },
          ],
        },
      ],
    } as AskUIMessage;
    expect(citationsFromAskMessage(message)).toEqual([tilCite]);
  });
});

describe("questionForAssistantTurn", () => {
  it("uses the user turn immediately before the assistant", () => {
    const messages = [
      { id: "1", role: "user", parts: [{ type: "text", text: " first " }] },
      { id: "2", role: "assistant", parts: [{ type: "text", text: "a1" }] },
      { id: "3", role: "user", parts: [{ type: "text", text: "why SSDs?" }] },
      { id: "4", role: "assistant", parts: [{ type: "text", text: "because" }] },
    ] as AskUIMessage[];
    expect(questionForAssistantTurn(messages, 3)).toBe("why SSDs?");
    expect(questionForAssistantTurn(messages, 1)).toBe("first");
  });

  it("returns empty when there is no prior user turn", () => {
    const messages = [{ id: "2", role: "assistant", parts: [{ type: "text", text: "hi" }] }] as AskUIMessage[];
    expect(questionForAssistantTurn(messages, 0)).toBe("");
  });
});

describe("buildAskSave", () => {
  it("pairs the question with parsed summary, answer, citations, and model", () => {
    const save = buildAskSave({
      question: "  why SSDs?  ",
      answer: `## Summary
They lost to NVMe.

## Why
Thermals.`,
      citations: [tilCite],
      model: "google/gemini-3.5-flash",
    });
    expect(save.question).toBe("why SSDs?");
    expect(save.summary).toBe("They lost to NVMe.");
    expect(save.answer).toContain("## Summary");
    expect(save.citations).toEqual([tilCite]);
    expect(save.model).toBe("google/gemini-3.5-flash");
  });

  it("rejects a blank question or answer", () => {
    expect(() => buildAskSave({ question: "  ", answer: "ok", citations: [], model: "x" })).toThrow(/question/i);
    expect(() => buildAskSave({ question: "q", answer: "  ", citations: [], model: "x" })).toThrow(/answer/i);
  });
});

describe("createAskSaveSchema", () => {
  it("accepts a built save and rejects empty fields", () => {
    const parsed = createAskSaveSchema.parse({
      question: "why?",
      answer: "because",
      summary: "because",
      citations: [],
      model: "poolside/laguna-s-2.1-free",
    });
    expect(parsed.question).toBe("why?");
    expect(createAskSaveSchema.safeParse({ question: "", answer: "a", citations: [], model: "x" }).success).toBe(
      false
    );
  });
});

describe("groupKeptByDay", () => {
  const now = new Date("2026-08-21T20:00:00");

  it("files stamps into TODAY / YDAY drawers and matches a query", () => {
    const items = [
      stamp("1", "2026-08-21T18:00:00", "postgres hnsw"),
      stamp("2", "2026-08-21T10:00:00", "rate limiting"),
      stamp("3", "2026-08-20T12:00:00", "gpu ssd"),
    ];
    const groups = groupKeptByDay(items, now);
    expect(groups.map((group) => group.label)).toEqual(["TODAY", "YDAY"]);
    expect(groups[0]?.stamps).toHaveLength(2);
    expect(keptDayLabel("2026-08-16", now)).toBe("SUN AUG 16");
    expect(filterKeptStamps(items, "postgres").map((item) => item.id)).toEqual(["1"]);
    expect(filterKeptStamps(items, "missing topic")).toEqual([]);
    expect(filterKeptStamps([{ ...items[0], title: "HNSW Index Tuning" }], "hnsw index").map((item) => item.id)).toEqual(
      ["1"]
    );
  });
});

describe("needsKeptTitle", () => {
  it("names empty, snippet, and raw-question titles once", () => {
    const question = "give me an AI engineering learning plan, what to learn first";
    expect(needsKeptTitle("", question)).toBe(true);
    expect(needsKeptTitle(snippetKeptTitle(question), question)).toBe(true);
    expect(needsKeptTitle(question, question)).toBe(true);
    expect(needsKeptTitle("AI Engineering Learning Plan", question)).toBe(false);
    expect(displayKeptTitle("", question)).toBe(snippetKeptTitle(question));
    expect(displayKeptTitle("AI Engineering Learning Plan", question)).toBe("AI Engineering Learning Plan");
  });
});

function stamp(id: string, createdAt: string, question: string) {
  return { id, question, answer: question, summary: question, citations: [], createdAt };
}
