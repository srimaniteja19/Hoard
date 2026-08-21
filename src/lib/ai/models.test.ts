import { describe, expect, it } from "vitest";
import { ASK_MODEL, ASK_MODELS, askFallbackModels, resolveAskModel } from "./askModels";
import { gatewayErrorMessage, gatewayProviderOptions } from "./models";

describe("gatewayErrorMessage", () => {
  it("rewrites free-tier rate limits into an actionable line", () => {
    expect(
      gatewayErrorMessage(
        new Error(
          "Free tier requests on this model are rate-limited. Upgrade to paid credits"
        )
      )
    ).toContain("free-tier limit hit");
  });

  it("passes through other errors", () => {
    expect(gatewayErrorMessage(new Error("model not found"))).toBe("model not found");
  });
});

describe("resolveAskModel", () => {
  it("defaults to the free Laguna model", () => {
    expect(ASK_MODEL).toBe("poolside/laguna-s-2.1-free");
    expect(resolveAskModel(undefined)).toBe(ASK_MODEL);
    expect(resolveAskModel("not-a-model")).toBe(ASK_MODEL);
  });

  it("accepts only the Ask allowlist", () => {
    for (const model of ASK_MODELS) {
      expect(resolveAskModel(model.id)).toBe(model.id);
    }
    expect(resolveAskModel("openai/gpt-5.4-pro")).toBe(ASK_MODEL);
  });

  it("falls back through the other Ask models when the selected one is limited", () => {
    expect(askFallbackModels("poolside/laguna-s-2.1-free")).toEqual([
      "google/gemini-3.5-flash-lite",
      "google/gemini-3.5-flash",
      "google/gemini-3.7-flash",
      "openai/gpt-5.4-mini",
      "openai/gpt-5.4",
    ]);
    expect(askFallbackModels("google/gemini-3.5-flash")).toContain("poolside/laguna-s-2.1-free");
    expect(askFallbackModels("google/gemini-3.5-flash")).not.toContain("google/gemini-3.5-flash");
  });
});

describe("gatewayProviderOptions", () => {
  it("keeps Gemini fallbacks for triage", () => {
    expect(gatewayProviderOptions("google/gemini-3.5-flash-lite", ["feature:capture-triage"]).gateway).toEqual({
      models: ["google/gemini-3.5-flash", "google/gemini-3-flash"],
      tags: ["feature:capture-triage"],
    });
  });
});
