import { describe, expect, it } from "vitest";
import { bufferText, captionChecks, estimateSeconds, parseHashtags, productionBrief, scriptChecks, voiceScript } from "./checks";

const script = [
  { text: "Two founders stared at the same legal gray zone and made opposite bets." },
  { text: "Pause and guess: what happened in 2022? Regulators fined Polymarket." },
  { text: "Please follow and share for more interesting, random content like this." },
];

describe("studio checks", () => {
  it("estimates spoken length", () => {
    const { words, seconds } = estimateSeconds(script);
    expect(words).toBe(34);
    expect(seconds).toBeGreaterThan(13);
    expect(seconds).toBeLessThan(15.5);
  });

  it("flags em dashes and a missing follow line", () => {
    const checks = scriptChecks({ format: "reel", script: [{ text: "A line — with a dash." }] });
    expect(checks.map((c) => c.text)).toContain("Remove em dashes");
    expect(checks.map((c) => c.text)).toContain("Add the follow and share line");
  });

  it("warns above five hashtags and trims Buffer text to five", () => {
    const piece = { caption: "Hi. Please follow and share.", hashtags: "a b c d e f" };
    expect(parseHashtags(piece.hashtags)).toHaveLength(6);
    expect(captionChecks(piece).some((c) => c.text.includes("Instagram allows 5"))).toBe(true);
    expect(bufferText(piece)).toBe("Hi. Please follow and share.\n\n#a #b #c #d #e");
  });

  it("adds a spoken pause after pause and guess", () => {
    expect(voiceScript(script)).toContain("what happened in 2022? (pause about 1 second) Regulators");
  });

  it("puts series and house rules in the brief", () => {
    const brief = productionBrief({ title: "P2", format: "reel", script, sources: [], notes: "", part: 2 }, { title: "Prediction Markets", theme: "paper" });
    expect(brief).toContain("Series: Prediction Markets, Part 2, keep the paper theme");
    expect(brief).toContain("## House rules");
    expect(brief).not.toMatch(/—/);
  });
});
