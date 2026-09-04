import { describe, it, expect } from "vitest";
import {
  parseGotcha,
  parseQuote,
  parseOpinion,
  parsePattern,
  parseNote,
  stripNote,
  combineWithNote,
  parseNews,
  extractBulletPoints,
} from "./entryParser";

describe("entryParser", () => {
  describe("parseGotcha", () => {
    it("parses labeled I THOUGHT / ACTUALLY / COST", () => {
      const input =
        "I THOUGHT: mix-blend-mode blends against the page background.\nACTUALLY: It composites against the nearest stacking context.\nCOST: Two hours debugging.";
      const res = parseGotcha(input);
      expect(res.thought).toBe("mix-blend-mode blends against the page background.");
      expect(res.actually).toBe("It composites against the nearest stacking context.");
      expect(res.cost).toBe("Two hours debugging.");
    });

    it("parses two-line fallback input", () => {
      const input = "Thought: A\nActually: B";
      const res = parseGotcha(input);
      expect(res.thought).toBe("A");
      expect(res.actually).toBe("B");
      expect(res.cost).toBeUndefined();
    });

    it("handles plain text fallback gracefully", () => {
      const res = parseGotcha("Single line text");
      expect(res.thought).toBeDefined();
      expect(res.actually).toBe("Single line text");
    });
  });

  describe("parseQuote", () => {
    it("parses quote with em dash author", () => {
      const input = '"A distributed system is one where a machine you\'ve never heard of can stop yours from working." — Leslie Lamport';
      const res = parseQuote(input);
      expect(res.quote).toBe("A distributed system is one where a machine you've never heard of can stop yours from working.");
      expect(res.author).toBe("Leslie Lamport");
    });

    it("handles quote without author", () => {
      const input = '"Simplicity is prerequisite for reliability."';
      const res = parseQuote(input);
      expect(res.quote).toBe("Simplicity is prerequisite for reliability.");
      expect(res.author).toBeUndefined();
    });
  });

  describe("parseOpinion", () => {
    it("parses opinion with conviction tag", () => {
      const input = 'Most "we need a message queue" moments are really "our transaction boundary is wrong." [conviction:5]';
      const res = parseOpinion(input, new Date());
      expect(res.conviction).toBe(5);
      expect(res.take).toBe('Most "we need a message queue" moments are really "our transaction boundary is wrong."');
      expect(res.ageDays).toBe(1);
    });
  });

  describe("parsePattern", () => {
    it("parses pattern title and bulleted instances", () => {
      const input = "Every silent CSS bug was a stacking context.\n- [AUG 22] mix-blend-mode\n- [JUL 09] position: fixed";
      const res = parsePattern(input, "TODAY");
      expect(res.name).toBe("Every silent CSS bug was a stacking context.");
      expect(res.instances).toHaveLength(2);
      expect(res.instances[0].date).toBe("AUG 22");
      expect(res.instances[0].note).toBe("mix-blend-mode");
      expect(res.instances[1].date).toBe("JUL 09");
      expect(res.instances[1].note).toBe("position: fixed");
    });
  });

  describe("note utilities", () => {
    it("parses attached note and strips it cleanly", () => {
      const input = "LPCAMM2 replaces SO-DIMM.\n\n--- NOTE ---\nChecked compatibility with Dell Precision.";
      expect(parseNote(input)).toBe("Checked compatibility with Dell Precision.");
      expect(stripNote(input)).toBe("LPCAMM2 replaces SO-DIMM.");
    });

    it("combines base text with note", () => {
      const combined = combineWithNote("Base insight", "My follow-up thoughts");
      expect(combined).toBe("Base insight\n\n--- NOTE ---\nMy follow-up thoughts");
      expect(parseNote(combined)).toBe("My follow-up thoughts");
      expect(stripNote(combined)).toBe("Base insight");
    });

    it("handles null/empty note safely", () => {
      expect(parseNote(null)).toBeNull();
      expect(stripNote(null)).toBe("");
      expect(combineWithNote("Base insight", null)).toBe("Base insight");
      expect(combineWithNote("Base insight", "")).toBe("Base insight");
    });
  });

  describe("extractBulletPoints & parseNews", () => {
    it("extracts multiline bullet points with asterisks and dashes", () => {
      const input = "* First point\n* Second point\n- Third point";
      const res = parseNews(input);
      expect(res.items).toEqual(["First point", "Second point", "Third point"]);
      expect(res.headline).toBeUndefined();
    });

    it("parses headline, bullet items, and source", () => {
      const input = "HEADLINE: Frontline Intelligence\n* Item A\n* Item B\nSOURCE: Reuters";
      const res = parseNews(input);
      expect(res.headline).toBe("Frontline Intelligence");
      expect(res.items).toEqual(["Item A", "Item B"]);
      expect(res.source).toBe("Reuters");
    });

    it("handles the exact user briefing format with asterisks", () => {
      const input = "* Leaked internal documents indicate low probability.\n  * Ukrainian forces secure minor gains.\n  * Russia escalates aerial attacks.";
      const res = parseNews(input);
      expect(res.items).toHaveLength(3);
      expect(res.items[0]).toContain("Leaked internal documents");
      expect(res.items[1]).toContain("Ukrainian forces");
      expect(res.items[2]).toContain("Russia escalates");
    });
  });
});

