import type { LeadCandidate } from "./types";

export const ANY_TIME_MINUTES = 180;
const MAX_FOLLOW = 3;

export type PackedWindow = {
  lead: LeadCandidate | null;
  /** False when the lead is longer than the dial window. */
  fits: boolean;
  stack: LeadCandidate[];
  leftoverMinutes: number | null;
};

function withPinnedLead(ranked: LeadCandidate[], pinnedLeadId: string | null): LeadCandidate[] {
  if (!pinnedLeadId) return ranked;
  const pin = ranked.find((candidate) => candidate.id === pinnedLeadId);
  if (!pin) return ranked;
  return [pin, ...ranked.filter((candidate) => candidate.id !== pinnedLeadId)];
}

export function packWindow(
  ranked: LeadCandidate[],
  minutes: number,
  pinnedLeadId: string | null = null,
): PackedWindow {
  const ordered = withPinnedLead(ranked, pinnedLeadId);
  const lead = ordered[0] ?? null;
  const anyTime = minutes === ANY_TIME_MINUTES;

  if (!lead) {
    return {
      lead: null,
      fits: true,
      stack: [],
      leftoverMinutes: anyTime ? null : minutes,
    };
  }

  const fits = anyTime || lead.estimatedMinutes <= minutes;
  let remaining = anyTime ? Number.POSITIVE_INFINITY : fits ? minutes - lead.estimatedMinutes : minutes;
  const stack: LeadCandidate[] = [];

  for (const item of ordered.slice(1)) {
    if (stack.length >= MAX_FOLLOW) break;
    if (!anyTime && item.estimatedMinutes > remaining) continue;
    stack.push(item);
    if (!anyTime) remaining -= item.estimatedMinutes;
  }

  return {
    lead,
    fits,
    stack,
    leftoverMinutes: anyTime ? null : Math.max(0, remaining),
  };
}

export function nextInStack(packed: PackedWindow): string | null {
  return packed.stack[0]?.id ?? null;
}
