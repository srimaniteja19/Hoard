import type { ContextType, KindType } from "@/types";
import { CTX } from "@/data/initialBookmarks";
import type { LeadCandidate } from "./types";

export type EnergyRank = {
  context: ContextType;
  preferDeep: boolean;
};

export function filterCandidates(candidates: LeadCandidate[], ctx: ContextType): LeadCandidate[] {
  if (ctx === "all") return candidates;
  const allowed = new Set<KindType>(CTX[ctx]);
  return candidates.filter((c) => c.source === "todo" || (c.kind !== null && allowed.has(c.kind)));
}

export function excludeIds(candidates: LeadCandidate[], ids: Iterable<string>): LeadCandidate[] {
  const blocked = ids instanceof Set ? ids : new Set(ids);
  if (blocked.size === 0) return candidates;
  return candidates.filter((c) => !blocked.has(c.id));
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

function energyFit(c: LeadCandidate, energy: EnergyRank): number {
  if (c.source !== "todo" || c.energy !== "DEEP") return 1;
  if (energy.context === "wind") return 0.05;
  if (energy.preferDeep) return 1.35;
  return 1;
}

export function score(
  c: LeadCandidate,
  minutes: number,
  lastLedId: string | null,
  energy: EnergyRank = { context: "all", preferDeep: false },
): number {
  return (
    fitScore(minutes, c.estimatedMinutes) *
    urgencyScore(c) *
    varietyPenalty(c.id, lastLedId) *
    energyFit(c, energy)
  );
}

function demoteDeepLead(ranked: LeadCandidate[], context: ContextType): LeadCandidate[] {
  if (context !== "wind" || ranked.length < 2) return ranked;
  const lead = ranked[0];
  if (!(lead.source === "todo" && lead.energy === "DEEP")) return ranked;
  const alt = ranked.findIndex((c) => !(c.source === "todo" && c.energy === "DEEP"));
  if (alt < 1) return ranked;
  const next = [...ranked];
  const [pick] = next.splice(alt, 1);
  return [pick, ...next];
}

export function rankCandidates(
  candidates: LeadCandidate[],
  minutes: number,
  lastLedId: string | null,
  energy: EnergyRank = { context: "all", preferDeep: false },
): LeadCandidate[] {
  const ranked = [...candidates].sort((a, b) => {
    const ds = score(b, minutes, lastLedId, energy) - score(a, minutes, lastLedId, energy);
    if (ds !== 0) return ds;
    if (a.source !== b.source) return a.source === "todo" ? -1 : 1;
    return b.ageDays - a.ageDays;
  });
  return demoteDeepLead(ranked, energy.context);
}
