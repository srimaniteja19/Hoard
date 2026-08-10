import { describe, it, expect } from "vitest";
import { maskTextWords, maskCodeLines } from "./masking";

describe("maskTextWords", () => {
  it("shows first ~28% of words on word boundaries", () => {
    const text = "One two three four five six seven eight nine ten"; // 10 words
    const result = maskTextWords(text, 0.28);

    // ceil(10 * 0.28) = 3 words
    expect(result.revealedText).toBe("One two three");
    expect(result.maskedWordsCount).toBe(7);
    expect(result.totalWords).toBe(10);
  });

  it("handles single-word text without masking", () => {
    const result = maskTextWords("Hello");
    expect(result.revealedText).toBe("Hello");
    expect(result.maskedWordsCount).toBe(0);
  });

  it("never splits mid-word", () => {
    const text = "PostgreSQL indexing strategies";
    const result = maskTextWords(text, 0.28);
    expect(["PostgreSQL", "PostgreSQL indexing"]).toContain(result.revealedText);
  });
});

describe("maskCodeLines", () => {
  it("masks code by line, not by word", () => {
    const code = [
      "const a = 1;",
      "const b = 2;",
      "function add() {",
      "  return a + b;",
      "}",
      "console.log(add());",
      "export default add;",
      "// end of file",
      "// line 9",
      "// line 10",
    ].join("\n"); // 10 lines

    const result = maskCodeLines(code, 0.28);

    // ceil(10 * 0.28) = 3 lines
    expect(result.revealedLines.length).toBe(3);
    expect(result.revealedLines[0]).toBe("const a = 1;");
    expect(result.revealedLines[2]).toBe("function add() {");
    expect(result.maskedLinesCount).toBe(7);
    expect(result.totalLines).toBe(10);
  });
});
