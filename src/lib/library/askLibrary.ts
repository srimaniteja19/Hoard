import {
  convertToModelMessages,
  createUIMessageStream,
  smoothStream,
  streamText,
  type UIMessage,
} from "ai";
import { ASK_MODEL, askFallbackModels, gatewayErrorMessage, gatewayProviderOptions, languageModel } from "@/lib/ai/models";
import type { AskModelId } from "@/lib/ai/askModels";
import { isThinSnippet } from "@/lib/library/askAnswer";
import { relatedHits } from "@/lib/library/relatedHits";
import { citationHref, fetchVector, type VectorHit } from "@/lib/library/fetchVector";

export type AskShelfItem = {
  ownerType: VectorHit["ownerType"];
  ownerId: string;
  title: string;
  kind: string;
  snippet: string;
  url: string;
  href: string;
  thin: boolean;
};

export type AskUIMessage = UIMessage<never, { shelf: AskShelfItem[] }>;

export function lastUserQuery(messages: AskUIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== "user") continue;
    return message.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("")
      .trim();
  }
  return "";
}

export function toShelfItem(hit: VectorHit): AskShelfItem {
  return {
    ownerType: hit.ownerType,
    ownerId: hit.ownerId,
    title: hit.title,
    kind: hit.kind,
    snippet: hit.snippet,
    url: hit.url,
    href: citationHref(hit),
    thin: isThinSnippet(hit.title, hit.snippet),
  };
}

export function formatShelf(hits: AskShelfItem[]): string {
  if (hits.length === 0) return "(no matching cards on the shelf)";
  return hits
    .map((hit, index) => {
      const flag = hit.thin ? "THIN" : hit.kind || "CARD";
      const body = hit.snippet || hit.title;
      return `${index + 1}. [${flag}] ${hit.title}\n${body}`;
    })
    .join("\n\n");
}

export const ASK_SYSTEM = `You are Hoard's library desk: a compact ChatGPT for this person's bookmarks and TILs.

Shelf cards are attached only when they are actually about this question. If the shelf is empty, answer from general knowledge and do not mention, cite, or force a link to some other save.

ALWAYS answer the question.
- If a shelf card has the explanation, use it.
- If a shelf card is thin (title-only, empty note, YouTube/video with no transcript) but is clearly the same topic, still answer, with one honest line that their save is a pointer.
- Never refuse with "I don't have the video contents" or "only a title."
- Never pretend an unrelated card (different topic) is a source for this answer.

Format in compact markdown. No preamble. No "great question." Start writing immediately.
1. Start with \`## Summary\` and 1–2 sentences that actually answer the question.
2. Then a short explanation: \`##\` headings when useful, bullets, bold key terms, inline \`code\` for technical names. 2–4 tight blocks, not an essay.
3. Do not dump raw snippets.
4. The UI already shows citations; you may name a source by title only when it is on the shelf.`;

export function streamLibraryAsk(userId: string, messages: AskUIMessage[], model: AskModelId = ASK_MODEL) {
  const query = lastUserQuery(messages);

  return createUIMessageStream<AskUIMessage>({
    originalMessages: messages,
    onError: gatewayErrorMessage,
    execute: async ({ writer }) => {
      const neighbors = query ? await fetchVector(userId, query, 8) : [];
      const hits = relatedHits(query, neighbors).map(toShelfItem);
      writer.write({ type: "data-shelf", id: "shelf", data: hits });

      const result = streamText({
        model: languageModel(model),
        system: `${ASK_SYSTEM}\n\n## Shelf\n${formatShelf(hits)}`,
        messages: await convertToModelMessages(messages),
        experimental_transform: smoothStream({ chunking: "word", delayInMs: 12 }),
        maxRetries: 0,
        providerOptions: {
          ...gatewayProviderOptions(model, ["feature:library-ask"], askFallbackModels(model)),
          openai: { reasoningEffort: "minimal" },
          google: { thinkingConfig: { thinkingBudget: 0 } },
        },
      });

      writer.merge(
        result.toUIMessageStream({
          sendStart: false,
          sendReasoning: false,
          onError: gatewayErrorMessage,
        })
      );
    },
  });
}
