export const ASK_MODELS = [
  { id: "poolside/laguna-s-2.1-free", label: "Laguna S 2.1", hint: "free" },
  { id: "google/gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite", hint: "fast" },
  { id: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash", hint: "" },
  { id: "google/gemini-3.7-flash", label: "Gemini 3.7 Flash", hint: "" },
  { id: "openai/gpt-5.4-mini", label: "GPT-5.4 Mini", hint: "" },
  { id: "openai/gpt-5.4", label: "GPT-5.4", hint: "" },
] as const;

export type AskModelId = (typeof ASK_MODELS)[number]["id"];

export const ASK_MODEL: AskModelId = "poolside/laguna-s-2.1-free";

const ASK_MODEL_IDS = new Set<string>(ASK_MODELS.map((model) => model.id));

export function isAskModelId(value: string): value is AskModelId {
  return ASK_MODEL_IDS.has(value);
}

export function resolveAskModel(value: unknown): AskModelId {
  return typeof value === "string" && isAskModelId(value) ? value : ASK_MODEL;
}
