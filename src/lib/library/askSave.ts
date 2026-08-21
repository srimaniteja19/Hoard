import { z } from "zod";
import { parseAskAnswer } from "./askAnswer";
import type { AskUIMessage } from "./askLibrary";

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
  const seen = new Set<string>();
  const out: AskSaveCitation[] = [];

  for (const part of message.parts) {
    if (part.type !== "data-shelf" || !Array.isArray(part.data)) continue;
    for (const hit of part.data) {
      const ownerType = hit.ownerType === "til" ? "til" : hit.ownerType === "bookmark" ? "bookmark" : null;
      const ownerId = typeof hit.ownerId === "string" ? hit.ownerId : "";
      const title = typeof hit.title === "string" ? hit.title : "";
      const href = typeof hit.href === "string" ? hit.href : "";
      const kind = typeof hit.kind === "string" ? hit.kind : "";
      const key = `${ownerType}:${ownerId}`;
      if (!ownerType || !ownerId || !title || !href || seen.has(key)) continue;
      seen.add(key);
      out.push({ ownerType, ownerId, title, href, kind });
    }
  }
  return out;
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
