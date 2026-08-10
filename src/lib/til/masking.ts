/**
 * Masking utilities for RECALL cards.
 *
 * Masking shows the first ~28% of words/lines; the rest render as filled masked blocks.
 * Computes split strictly on word/line boundaries.
 */

export function maskTextWords(text: string, revealRatio = 0.28): {
  revealedText: string;
  maskedWordsCount: number;
  totalWords: number;
} {
  if (!text || !text.trim()) {
    return { revealedText: "", maskedWordsCount: 0, totalWords: 0 };
  }

  const words = text.trim().split(/\s+/);
  if (words.length <= 1) {
    return { revealedText: text, maskedWordsCount: 0, totalWords: words.length };
  }

  const revealCount = Math.max(1, Math.ceil(words.length * revealRatio));
  const revealedText = words.slice(0, revealCount).join(" ");
  const maskedWordsCount = words.length - revealCount;

  return {
    revealedText,
    maskedWordsCount,
    totalWords: words.length,
  };
}

export function maskCodeLines(code: string, revealRatio = 0.28): {
  revealedLines: string[];
  maskedLinesCount: number;
  totalLines: number;
} {
  if (!code) {
    return { revealedLines: [], maskedLinesCount: 0, totalLines: 0 };
  }

  const lines = code.split("\n");
  if (lines.length <= 1) {
    return { revealedLines: lines, maskedLinesCount: 0, totalLines: lines.length };
  }

  const revealCount = Math.max(1, Math.ceil(lines.length * revealRatio));
  const revealedLines = lines.slice(0, revealCount);
  const maskedLinesCount = lines.length - revealCount;

  return {
    revealedLines,
    maskedLinesCount,
    totalLines: lines.length,
  };
}
