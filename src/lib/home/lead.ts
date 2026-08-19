import type { LeadCandidate } from "./types";

/** Where opening a lead navigates to — a bookmark opens its reading session, a todo goes to the list. */
export function leadHref(lead: LeadCandidate): string {
  return lead.source === "todo" ? "/todos" : `/session?id=${lead.id}`;
}

/** Which rail a lead belongs to, for the kicker label ("THE AGENDA" vs "THE QUEUE"). */
export function leadDept(lead: LeadCandidate | null): "queue" | "agenda" {
  return lead?.source === "todo" ? "agenda" : "queue";
}

/** Clamps the "I have N minutes" URL param to the dial's [5, 180] range, snapped to 5-minute steps. */
export function normalizeTimeParam(value: string | null): number {
  if (value === null || value.trim() === "") return 180;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 180;
  const clamped = Math.min(180, Math.max(5, parsed));
  return Math.round(clamped / 5) * 5;
}
