import type { LeadCandidate } from "./types";

export type StandfirstClass =
  | "overdue-todo"
  | "due-today"
  | "moved-repeatedly"
  | "old-unread"
  | "fits";

const TEMPLATES: Record<StandfirstClass, string> = {
  "overdue-todo":
    "{minutes} minutes. This has been overdue {ageDays} days. Do it now rather than moving it again.",
  "due-today": "{minutes} minutes. Due today. That is the whole window.",
  "moved-repeatedly":
    "{minutes} minutes. You have moved this {rolloverCount} times, which means you have now spent longer avoiding it than doing it would take.",
  "old-unread":
    "{minutes} minutes. This has sat unread for {ageDays} days. Open it or drop it.",
  fits: "{minutes} minutes. This is what fits.",
};

export function classify(c: LeadCandidate): StandfirstClass {
  if (c.source === "todo" && c.overdueDays !== null && c.overdueDays > 0) return "overdue-todo";
  if (c.source === "todo" && c.dueToday) return "due-today";
  if (c.source === "todo" && (c.rolloverCount ?? 0) >= 3) return "moved-repeatedly";
  if (c.source === "bookmark" && c.ageDays > 30) return "old-unread";
  return "fits";
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function standfirst(c: LeadCandidate, minutes: number): string {
  const cls = classify(c);
  const template = TEMPLATES[cls];
  void hashId(c.id);
  return template
    .replaceAll("{minutes}", String(minutes))
    .replaceAll("{rolloverCount}", String(c.rolloverCount ?? 0))
    .replaceAll("{ageDays}", String(c.overdueDays ?? c.ageDays));
}
