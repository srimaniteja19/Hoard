import { generateText } from "ai";
import { TRIAGE_MODEL, gatewayProviderOptions, languageModel } from "@/lib/ai/models";
import {
  cleanFolioTitle,
  clipFolioText,
  firstRoleText,
  titleFromMessages,
  type AskStoredMessage,
} from "@/lib/library/askThread";

export async function nameAskFolio(messages: AskStoredMessage[]): Promise<string> {
  const fallback = titleFromMessages(messages);
  const question = clipFolioText(firstRoleText(messages, "user"), 400);
  const answer = clipFolioText(firstRoleText(messages, "assistant"), 500);
  if (!question) return fallback;

  try {
    const result = await generateText({
      model: languageModel(TRIAGE_MODEL),
      timeout: { totalMs: 6000 },
      maxRetries: 0,
      providerOptions: gatewayProviderOptions(TRIAGE_MODEL, ["feature:ask-folio-title"]),
      prompt: `Name this library desk sheet. Return only the title.

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
    return cleanFolioTitle(result.text, fallback);
  } catch {
    return fallback;
  }
}
