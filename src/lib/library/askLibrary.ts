import { convertToModelMessages, stepCountIs, streamText, tool, type InferUITools, type UIMessage } from "ai";
import { z } from "zod";
import { ASK_MODEL, askFallbackModels, gatewayProviderOptions, languageModel } from "@/lib/ai/models";
import type { AskModelId } from "@/lib/ai/askModels";
import { citationHref, fetchVector } from "@/lib/library/fetchVector";

export function createLibraryAskTools(userId: string) {
  return {
    fetchVector: tool({
      description:
        "Search the user's saved library. Returns bookmarks and TILs ranked by semantic similarity. Call this before answering any question about what they saved, learned, or bookmarked.",
      inputSchema: z.object({
        query: z
          .string()
          .describe("The search query to retrieve relevant bookmarks and TILs"),
      }),
      execute: async ({ query }) => {
        const hits = await fetchVector(userId, query, 8);
        return hits.map((hit) => ({
          ownerType: hit.ownerType,
          ownerId: hit.ownerId,
          title: hit.title,
          kind: hit.kind,
          snippet: hit.snippet,
          url: hit.url,
          href: citationHref(hit),
        }));
      },
    }),
  };
}

export type LibraryAskTools = ReturnType<typeof createLibraryAskTools>;
export type AskUIMessage = UIMessage<never, never, InferUITools<LibraryAskTools>>;

export const ASK_SYSTEM = `You answer questions about this person's own library — bookmarks and TILs they have saved. You do not browse the public web.

Always call fetchVector before answering. Prefer one focused query; call it a second time only if the first results are clearly off-topic.

Answer from the retrieved snippets only. If nothing relevant comes back, say you don't have anything saved on that and stop. Do not invent sources.

Write a short synthesis (a few sentences, or a tight bullet list). After the answer, cite the sources you actually used by title. Do not dump raw snippets.`;

export async function streamLibraryAsk(
  userId: string,
  messages: AskUIMessage[],
  model: AskModelId = ASK_MODEL
) {
  const tools = createLibraryAskTools(userId);
  return streamText({
    model: languageModel(model),
    system: ASK_SYSTEM,
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    stopWhen: stepCountIs(5),
    maxRetries: 0,
    providerOptions: gatewayProviderOptions(model, ["feature:library-ask"], askFallbackModels(model)),
  });
}
