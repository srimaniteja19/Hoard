export type ReasonValidationResult = {
  valid: boolean;
  status: "A REASON IS REQUIRED" | "TOO SHORT TO BE A REASON" | "GOOD";
  wordCount: number;
  isWarn: boolean;
};

/**
 * Validates a Keep reason.
 * Requires 3+ non-empty words.
 *
 * Rules:
 * - Empty -> "A REASON IS REQUIRED"
 * - < 3 words -> "TOO SHORT TO BE A REASON"
 * - 3+ words -> "GOOD"
 */
export function validateKeepReason(reason: string): ReasonValidationResult {
  const trimmed = reason.trim();
  if (!trimmed) {
    return {
      valid: false,
      status: "A REASON IS REQUIRED",
      wordCount: 0,
      isWarn: true,
    };
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 3) {
    return {
      valid: false,
      status: "TOO SHORT TO BE A REASON",
      wordCount: words.length,
      isWarn: true,
    };
  }

  return {
    valid: true,
    status: "GOOD",
    wordCount: words.length,
    isWarn: false,
  };
}
