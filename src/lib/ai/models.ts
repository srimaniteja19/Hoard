import { gateway } from "ai";

export { ASK_MODEL, ASK_MODELS, resolveAskModel, type AskModelId } from "./askModels";

export const TRIAGE_MODEL = "google/gemini-3.5-flash-lite";

const GATEWAY_FALLBACKS = [
  "google/gemini-3.5-flash",
  "google/gemini-3.5-flash-lite",
  "google/gemini-3-flash",
] as const;

export function languageModel(model: string) {
  return gateway(model);
}

export function gatewayProviderOptions(
  model: string,
  tags: string[],
  fallbacks: readonly string[] = GATEWAY_FALLBACKS
) {
  const models = fallbacks.filter((id) => id !== model);
  return {
    gateway: {
      ...(models.length > 0 ? { models } : {}),
      tags,
    },
  };
}

export function gatewayErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/rate.?limit|free tier/i.test(message)) {
    return "AI Gateway free-tier limit hit. Try again in a minute, or add credits at vercel.com/ai.";
  }
  return message.replace(/^Error:\s*/, "") || "The library could not answer.";
}
