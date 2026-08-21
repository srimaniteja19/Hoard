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
