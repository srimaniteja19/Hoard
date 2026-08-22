import { generateText, gateway, stepCountIs } from "ai";
import { gatewayErrorMessage, gatewayProviderOptions, languageModel, TRIAGE_MODEL } from "@/lib/ai/models";
import { saveAtlas } from "@/lib/dal/atlas";
import { wireItemsFromToolOutput } from "@/lib/library/askWire";
import type { AtlasStreamEvent } from "./generate";
import {
  applyStationResources,
  pickStationResources,
  resourceSearchQuery,
  stationsNeedingResources,
} from "./resources";
import type { AtlasRecord, AtlasResource, AtlasStation, AtlasSyllabus } from "./types";

export async function searchAtlasResources(
  query: string,
  deps?: { search?: (query: string) => Promise<Array<{ title: string; href: string }>> },
): Promise<AtlasResource[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  if (deps?.search) return pickStationResources(await deps.search(trimmed));

  try {
    const result = await generateText({
      model: languageModel(TRIAGE_MODEL),
      system: "Call perplexity_search once for 2-3 learning resources (articles or YouTube) for this syllabus station. Do not write an answer.",
      prompt: trimmed,
      tools: {
        perplexity_search: gateway.tools.perplexitySearch({
          maxResults: 6,
          searchLanguageFilter: ["en"],
        }),
      },
      toolChoice: { type: "tool", toolName: "perplexity_search" },
      stopWhen: stepCountIs(2),
      maxRetries: 0,
      providerOptions: {
        ...gatewayProviderOptions(TRIAGE_MODEL, ["feature:atlas"]),
        google: { thinkingConfig: { thinkingBudget: 0 } },
      },
    });
    const hits = result.steps.flatMap((step) =>
      (step.toolResults ?? []).flatMap((tool) => wireItemsFromToolOutput(tool.output)),
    );
    return pickStationResources(hits);
  } catch (error) {
    console.error("[searchAtlasResources]", gatewayErrorMessage(error));
    return [];
  }
}

export async function mapPool<T>(items: T[], size: number, work: (item: T) => Promise<void>): Promise<void> {
  const queue = items.slice();
  const workers = Array.from({ length: Math.max(1, size) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item === undefined) return;
      await work(item);
    }
  });
  await Promise.all(workers);
}

export async function fillStationResources(opts: {
  title: string;
  stations: AtlasStation[];
  write: (stationId: string, resources: AtlasResource[]) => void | Promise<void>;
  search?: (query: string) => Promise<Array<{ title: string; href: string }>>;
}): Promise<void> {
  await mapPool(stationsNeedingResources(opts.stations), 3, async (station) => {
    const resources = await searchAtlasResources(resourceSearchQuery(opts.title, station), {
      search: opts.search,
    });
    if (resources.length === 0) return;
    await opts.write(station.id, resources);
  });
}

export async function persistAtlasResources(opts: {
  userId: string;
  row: AtlasRecord;
  write: (event: AtlasStreamEvent) => void;
  search?: (query: string) => Promise<Array<{ title: string; href: string }>>;
}): Promise<AtlasSyllabus> {
  let syllabus = opts.row.syllabus;
  let persistChain = Promise.resolve();

  await fillStationResources({
    title: opts.row.title,
    stations: opts.row.syllabus.stations,
    search: opts.search,
    write: (stationId, resources) => {
      persistChain = persistChain.then(async () => {
        const next = applyStationResources(syllabus, stationId, resources);
        if (!next) return;
        syllabus = next;
        await saveAtlas(opts.userId, opts.row.id, { syllabus });
        opts.write({ type: "resources", stationId, resources });
      });
    },
  });

  await persistChain;
  opts.write({ type: "done" });
  return syllabus;
}
