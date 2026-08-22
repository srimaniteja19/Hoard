import { z } from "zod";
import { parseAskAnswer } from "./askAnswer";
import type { AskUIMessage } from "./askLibrary";
import { shelfFromAskMessage } from "./askDesk";

export type AskSaveCitation = {
  ownerType: "bookmark" | "til";
  ownerId: string;
  title: string;
  href: string;
  kind: string;
};

export type AskSaveInput = {
  question: string;
  answer: string;
  summary: string;
  citations: AskSaveCitation[];
  model: string;
};

export const askSaveCitationSchema = z.object({
  ownerType: z.enum(["bookmark", "til"]),
  ownerId: z.string().min(1).max(128),
  title: z.string().min(1).max(500),
  href: z.string().min(1).max(2000),
  kind: z.string().max(32).default(""),
});

export const createAskSaveSchema = z.object({
  question: z.string().trim().min(1, "question required").max(4000),
  answer: z.string().trim().min(1, "answer required").max(80000),
  summary: z.string().max(2000).optional().default(""),
  citations: z.array(askSaveCitationSchema).max(16).optional().default([]),
  model: z.string().trim().min(1).max(120),
});

export function textFromAskMessage(message: AskUIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
}

export function citationsFromAskMessage(message: AskUIMessage): AskSaveCitation[] {
  return shelfFromAskMessage(message).map((hit) => ({
    ownerType: hit.ownerType,
    ownerId: hit.ownerId,
    title: hit.title,
    href: hit.href,
    kind: hit.kind,
  }));
}

export function questionForAssistantTurn(messages: AskUIMessage[], assistantIndex: number): string {
  for (let i = assistantIndex - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") return textFromAskMessage(messages[i]);
  }
  return "";
}

export function buildAskSave(input: {
  question: string;
  answer: string;
  citations: AskSaveCitation[];
  model: string;
}): AskSaveInput {
  const question = input.question.trim();
  const answer = input.answer.trim();
  if (!question) throw new Error("Question is required");
  if (!answer) throw new Error("Answer is required");
  const { summary } = parseAskAnswer(answer);
  return createAskSaveSchema.parse({
    question,
    answer,
    summary,
    citations: input.citations,
    model: input.model.trim(),
  });
}

export type KeptStamp = {
  id: string;
  title?: string;
  question: string;
  answer: string;
  summary: string;
  citations: Array<{ title: string }>;
  createdAt: string;
};

export function snippetKeptTitle(question: string): string {
  const text = question.replace(/\s+/g, " ").trim();
  if (!text) return "Untitled stamp";
  return text.length <= 52 ? text : `${text.slice(0, 49).trimEnd()}…`;
}

export function needsKeptTitle(existingTitle: string | null | undefined, question: string): boolean {
  const snippet = snippetKeptTitle(question);
  const title = (existingTitle ?? "").replace(/\s+/g, " ").trim();
  if (!title || title === "Untitled stamp") return true;
  if (title === snippet) return true;
  if (title === question.replace(/\s+/g, " ").trim()) return true;
  if (snippet.endsWith("…")) {
    const stem = snippet.slice(0, -1).trimEnd();
    if (stem && title === stem) return true;
  }
  return false;
}

export function displayKeptTitle(title: string | undefined, question: string): string {
  const named = (title ?? "").replace(/\s+/g, " ").trim();
  return named || snippetKeptTitle(question);
}

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function keptDayKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "undated";
  return localDayKey(date);
}

export function keptDayLabel(key: string, now = new Date()): string {
  if (key === "undated") return "UNDATED";
  const today = localDayKey(now);
  const yday = new Date(now);
  yday.setDate(yday.getDate() - 1);
  if (key === today) return "TODAY";
  if (key === localDayKey(yday)) return "YDAY";
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day)
    .toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })
    .replace(/,/g, "")
    .toUpperCase();
}

export function filterKeptStamps<T extends KeptStamp>(items: T[], query: string): T[] {
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return items;
  return items.filter((item) => {
    const hay = `${item.title ?? ""} ${item.question} ${item.summary} ${item.answer} ${item.citations.map((cite) => cite.title).join(" ")}`.toLowerCase();
    return tokens.every((token) => hay.includes(token));
  });
}

export function groupKeptByDay<T extends KeptStamp>(
  items: T[],
  now = new Date()
): { key: string; label: string; stamps: T[] }[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = keptDayKey(item.createdAt);
    const list = buckets.get(key);
    if (list) list.push(item);
    else buckets.set(key, [item]);
  }
  return [...buckets.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, stamps]) => ({ key, label: keptDayLabel(key, now), stamps }));
}
