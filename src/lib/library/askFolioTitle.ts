import { generateText } from "ai";
import { TRIAGE_MODEL, gatewayProviderOptions, languageModel } from "@/lib/ai/models";
import {
  cleanFolioTitle,
  clipFolioText,
  firstRoleText,
  titleFromMessages,
  type AskStoredMessage,
} from "@/lib/library/askThread";

export async function nameAskTitle(input: {
  question: string;
  answer: string;
  fallback: string;
  kind: "folio" | "stamp";
}): Promise<string> {
  const question = clipFolioText(input.question, 400);
  const answer = clipFolioText(input.answer, 500);
  if (!question) return input.fallback;

  const subject = input.kind === "stamp" ? "kept library stamp" : "library desk sheet";
  const feature = input.kind === "stamp" ? "feature:ask-save-title" : "feature:ask-folio-title";

  try {
    const result = await generateText({
      model: languageModel(TRIAGE_MODEL),
      timeout: { totalMs: 6000 },
      maxRetries: 0,
      providerOptions: gatewayProviderOptions(TRIAGE_MODEL, [feature]),
      prompt: `Name this ${subject}. Return only the title.

Rules:
- 3 to 7 words, Title Case
- No quotes, no period, no emoji
- Name the subject, not the user's phrasing
- Bad: "Give me an AI engineering learning plan"
- Good: "AI Engineering Learning Plan"

User:
${question}

Reply:
${answer || "(still writing)"}`,
    });
    return cleanFolioTitle(result.text, input.fallback);
  } catch {
    return input.fallback;
  }
}

export async function nameAskFolio(messages: AskStoredMessage[]): Promise<string> {
  return nameAskTitle({
    question: firstRoleText(messages, "user"),
    answer: firstRoleText(messages, "assistant"),
    fallback: titleFromMessages(messages),
    kind: "folio",
  });
}

export async function nameAskStamp(question: string, answer: string, fallback: string): Promise<string> {
  return nameAskTitle({ question, answer, fallback, kind: "stamp" });
}
