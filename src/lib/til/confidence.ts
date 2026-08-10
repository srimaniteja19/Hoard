/**
 * Confidence — derived retrievability for TIL entries.
 *
 * Based on the exponential forgetting curve: R = 2^(-t/S) where:
 *   R = retrievability (0–1)
 *   t = days since last review
 *   S = stability (days the memory holds at 50% recall)
 *
 * Confidence is R scaled to 0–100 and rounded.
 *
 * This is a pure function with no dependencies.
 * Never store confidence — always derive it from stability + lastReviewedAt.
 */

const MS_PER_DAY = 86_400_000;
const MIN_STABILITY = 0.5;

import { sql } from "drizzle-orm";
import { tilEntries } from "@/db/schema";

export const confidenceSql = sql<number>`round(100 * power(2, -extract(epoch from (now() - coalesce(${tilEntries.lastReviewedAt}, ${tilEntries.createdAt}))) / 86400 / greatest(${tilEntries.stability}, 0.5)))::int`;

/**
 * Compute confidence as an integer 0–100.
 *
 * @param stability   Days; how long the memory holds at 50% recall. Floored at 0.5.
 * @param lastReviewedAt  When the entry was last reviewed.
 * @param now             Current time (injectable for testing).
 */
export const confidence = (
  stability: number,
  lastReviewedAt: Date,
  now: Date = new Date(),
): number => {
  const days = (now.getTime() - lastReviewedAt.getTime()) / MS_PER_DAY;
  return Math.round(100 * Math.pow(2, -days / Math.max(stability, MIN_STABILITY)));
};

/**
 * SM-2 lite rating values.
 */
export type Rating = "GOT_IT" | "FUZZY" | "FORGOT";

/**
 * Compute updated SRS state after a review rating.
 *
 * Returns the new values for ease, stability, nextReviewAt, reviewCount, and lastReviewedAt.
 */
export function applyRating(
  rating: Rating,
  currentEase: number,
  currentStability: number,
  currentReviewCount: number,
  now: Date = new Date(),
): {
  ease: number;
  stability: number;
  nextReviewAt: Date;
  reviewCount: number;
  lastReviewedAt: Date;
} {
  let ease = currentEase;
  let stability = currentStability;

  switch (rating) {
    case "GOT_IT":
      ease = Math.min(ease + 0.1, 3.0);
      stability = stability * ease;
      break;
    case "FUZZY":
      ease = Math.max(ease - 0.15, 1.3);
      stability = stability * 1.3;
      break;
    case "FORGOT":
      ease = Math.max(ease - 0.2, 1.3);
      stability = 1;
      break;
  }

  const nextReviewAt = new Date(now.getTime() + stability * MS_PER_DAY);

  return {
    ease,
    stability,
    nextReviewAt,
    reviewCount: currentReviewCount + 1,
    lastReviewedAt: now,
  };
}
