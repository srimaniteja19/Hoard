import { describe, expect, it } from "vitest";
import { formatFolioWhen, needsFolioName, previewFromMessages, titleFromMessages, cleanFolioTitle, type AskStoredMessage } from "./askThread";

function msg(role: AskStoredMessage["role"], text: string, id: string = role): AskStoredMessage {
  return { id, role, parts: [{ type: "text", text }] };
}

describe("titleFromMessages", () => {
  it("uses the first user line, trimmed and clipped", () => {
    expect(titleFromMessages([msg("user", "  why didn't SSDs inside the GPU work?  ")])).toBe(
      "why didn't SSDs inside the GPU work?"
    );
    expect(titleFromMessages([msg("user", "a".repeat(80))])).toBe(`${"a".repeat(49)}…`);
    expect(titleFromMessages([msg("assistant", "hello")])).toBe("Untitled folio");
  });
});

describe("cleanFolioTitle", () => {
  it("strips quotes, labels, and trailing periods", () => {
    expect(cleanFolioTitle('"AI Engineering Learning Plan."')).toBe("AI Engineering Learning Plan");
    expect(cleanFolioTitle("Title: GPU SSD Experiment")).toBe("GPU SSD Experiment");
    expect(cleanFolioTitle("   \n", "Untitled folio")).toBe("Untitled folio");
  });
});

describe("needsFolioName", () => {
  const question = msg("user", "give me ai engineering learning plan, what to learn first and next");
  const stub = msg("assistant", "Working on it.");
  const answer = msg(
    "assistant",
    "## Summary\nA complete AI engineering learning plan broken into progressive phases, each with concrete topics."
  );

  it("waits for a real reply, then names snippet titles once", () => {
    expect(needsFolioName(undefined, [question])).toBe(false);
    expect(needsFolioName(undefined, [question, stub])).toBe(false);
    expect(needsFolioName(undefined, [question, answer])).toBe(true);
    expect(needsFolioName(titleFromMessages([question]), [question, answer])).toBe(true);
    expect(needsFolioName("AI Engineering Learning Plan", [question, answer])).toBe(false);
  });
});

describe("previewFromMessages", () => {
  it("uses the last non-empty text part", () => {
    expect(
      previewFromMessages([msg("user", "question", "u"), msg("assistant", "the short answer", "a")])
    ).toBe("the short answer");
  });
});

describe("formatFolioWhen", () => {
  it("stamps recent, yesterday, and dated folios", () => {
    const now = Date.parse("2026-08-21T15:00:00Z");
    expect(formatFolioWhen(new Date(now - 10_000).toISOString(), now)).toBe("NOW");
    expect(formatFolioWhen(new Date(now - 2 * 60_000).toISOString(), now)).toBe("2M");
    expect(formatFolioWhen("2026-08-20T20:00:00Z", now)).toBe("YDAY");
    expect(formatFolioWhen("2026-08-16T12:00:00Z", now)).toBe("08-16");
  });
});
