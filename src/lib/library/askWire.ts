import { generateText, gateway, stepCountIs } from "ai";
import { formatAskClock, wireRecencyFilter, wireSearchPrompt, type AskClock } from "./askClock";
import {
  gatewayErrorMessage,
  gatewayProviderOptions,
  languageModel,
  TRIAGE_MODEL,
} from "@/lib/ai/models";

export type AskWireItem = {
  title: string;
  href: string;
  snippet: string;
  date: string;
};

export const ASK_WIRE_SYSTEM = `A live wire is on. Current web results are attached below — weather, news, scores, prices, anything that changes.
- Prefer the shelf for this person's own notes and saves.
- Prefer the wire for what is true right now.
- Use the system clock date. "Last N days" is the N calendar days ending today, not an older month.
- If a wire hit's date is outside that range, ignore that date. Do not invent a series from training data.
- Name a wire source by title when you use it. Do not invent URLs.`;

export function formatWire(hits: AskWireItem[]): string {
  if (hits.length === 0) return "(the wire is quiet)";
  return hits
    .map((hit, index) => {
      const when = hit.date ? ` (${hit.date})` : "";
      const body = hit.snippet || hit.title;
      return `${index + 1}. ${hit.title}${when}\n${hit.href}\n${body}`;
    })
    .join("\n\n");
}

export function wireItemsFromToolOutput(output: unknown): AskWireItem[] {
  if (!output || typeof output !== "object" || Array.isArray(output)) return [];
  const record = output as Record<string, unknown>;
  if (typeof record.error === "string") return [];
  const rows = Array.isArray(record.results) ? record.results : [];
  const seen = new Set<string>();
  const out: AskWireItem[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const href = typeof item.url === "string" ? item.url.trim() : "";
    const title = typeof item.title === "string" ? item.title.trim() : "";
    if (!href || !title || seen.has(href)) continue;
    seen.add(href);
    out.push({
      title,
      href,
      snippet: typeof item.snippet === "string" ? item.snippet.trim() : "",
      date: typeof item.date === "string" ? item.date.trim() : "",
    });
  }
  return out;
}

export function wireFromAskMessage(message: { parts: Array<{ type: string; data?: unknown }> }): AskWireItem[] {
  const seen = new Set<string>();
  const out: AskWireItem[] = [];
  for (const part of message.parts) {
    if (part.type !== "data-wire" || !Array.isArray(part.data)) continue;
    for (const hit of part.data as Array<Record<string, unknown>>) {
      const href = typeof hit.href === "string" ? hit.href : "";
      const title = typeof hit.title === "string" ? hit.title : "";
      if (!href || !title || seen.has(href)) continue;
      seen.add(href);
      out.push({
        title,
        href,
        snippet: typeof hit.snippet === "string" ? hit.snippet : "",
        date: typeof hit.date === "string" ? hit.date : "",
      });
    }
  }
  return out;
}

function wireFromGenerateSteps(steps: Array<{ toolResults?: Array<{ output?: unknown }> }>): AskWireItem[] {
  const seen = new Set<string>();
  const out: AskWireItem[] = [];
  for (const step of steps) {
    for (const result of step.toolResults ?? []) {
      for (const hit of wireItemsFromToolOutput(result.output)) {
        if (seen.has(hit.href)) continue;
        seen.add(hit.href);
        out.push(hit);
      }
    }
  }
  return out;
}

export async function fetchWire(
  query: string,
  deps?: { search?: (query: string) => Promise<AskWireItem[]>; clock?: AskClock; timeZone?: string }
): Promise<AskWireItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  if (deps?.search) return deps.search(trimmed);

  const clock = deps?.clock ?? formatAskClock(deps?.timeZone ?? "UTC");
  const recency = wireRecencyFilter(trimmed);

  try {
    const result = await generateText({
      model: languageModel(TRIAGE_MODEL),
      system: "Call perplexity_search once for current web facts that answer this question. Do not write an answer.",
      prompt: wireSearchPrompt(trimmed, clock),
      tools: {
        perplexity_search: gateway.tools.perplexitySearch({
          maxResults: 6,
          searchLanguageFilter: ["en"],
          searchRecencyFilter: recency,
        }),
      },
      toolChoice: { type: "tool", toolName: "perplexity_search" },
      stopWhen: stepCountIs(2),
      maxRetries: 0,
      providerOptions: {
        ...gatewayProviderOptions(TRIAGE_MODEL, ["feature:library-ask-wire"]),
        google: { thinkingConfig: { thinkingBudget: 0 } },
      },
    });
    return wireFromGenerateSteps(result.steps);
  } catch (error) {
    console.error("[fetchWire]", gatewayErrorMessage(error));
    return [];
  }
}
