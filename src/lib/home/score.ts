import type { ContextType, KindType } from "@/types";
import { CTX } from "@/data/initialBookmarks";
import type { LeadCandidate } from "./types";

export function filterCandidates(candidates: LeadCandidate[], ctx: ContextType): LeadCandidate[] {
  if (ctx === "all") return candidates;
  const allowed = new Set<KindType>(CTX[ctx]);
  return candidates.filter((c) => c.source === "todo" || (c.kind !== null && allowed.has(c.kind)));
}

function fitScore(minutes: number, estimatedMinutes: number): number {
  if (minutes === 180) return 1;
  return Math.max(0.1, 1 - Math.abs(minutes - estimatedMinutes) / minutes);
}

function urgencyScore(c: LeadCandidate): number {
  if (c.source === "todo" && c.overdueDays !== null && c.overdueDays > 0) return 3.0;
  if (c.source === "todo" && c.dueToday) return 2.2;
  if (c.source === "todo" && (c.rolloverCount ?? 0) >= 3) return 2.0;
  if (c.source === "bookmark" && c.ageDays > 30) return 1.8;
  return 1.0;
}

function varietyPenalty(id: string, lastLedId: string | null): number {
  return lastLedId !== null && id === lastLedId ? 0.6 : 1.0;
}

export function score(c: LeadCandidate, minutes: number, lastLedId: string | null): number {
  return fitScore(minutes, c.estimatedMinutes) * urgencyScore(c) * varietyPenalty(c.id, lastLedId);
}

export function rankCandidates(
  candidates: LeadCandidate[],
  minutes: number,
  lastLedId: string | null
): LeadCandidate[] {
  return [...candidates].sort((a, b) => {
    const ds = score(b, minutes, lastLedId) - score(a, minutes, lastLedId);
    if (ds !== 0) return ds;
    if (a.source !== b.source) return a.source === "todo" ? -1 : 1;
    return b.ageDays - a.ageDays;
  });
}
