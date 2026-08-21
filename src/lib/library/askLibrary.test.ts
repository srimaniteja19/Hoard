import { describe, expect, it } from "vitest";
import { ASK_SYSTEM, formatShelf, lastUserQuery, type AskUIMessage } from "./askLibrary";

describe("ASK_SYSTEM", () => {
  it("requires a real answer even when the save is a thin title or video", () => {
    expect(ASK_SYSTEM).toMatch(/ALWAYS answer/i);
    expect(ASK_SYSTEM).toMatch(/## Summary/);
    expect(ASK_SYSTEM).toMatch(/thin/i);
    expect(ASK_SYSTEM).toMatch(/Start writing immediately/);
    expect(ASK_SYSTEM).toMatch(/unrelated/i);
    expect(ASK_SYSTEM).not.toMatch(/Always call fetchVector/);
  });
});

describe("lastUserQuery", () => {
  it("reads the latest user text part", () => {
    const messages = [
      { id: "1", role: "user", parts: [{ type: "text", text: "old" }] },
      { id: "2", role: "assistant", parts: [{ type: "text", text: "ok" }] },
      { id: "3", role: "user", parts: [{ type: "text", text: "why SSDs?" }] },
    ] as AskUIMessage[];
    expect(lastUserQuery(messages)).toBe("why SSDs?");
  });
});

describe("formatShelf", () => {
  it("marks empty libraries and thin cards", () => {
    expect(formatShelf([])).toContain("no matching cards");
    expect(
      formatShelf([
        {
          ownerType: "til",
          ownerId: "1",
          title: "Why SSDs",
          kind: "LINK",
          snippet: "Why SSDs",
          url: "https://youtu.be/x",
          href: "/til?hash=abcd",
          thin: true,
        },
      ])
    ).toContain("[THIN]");
  });
});
