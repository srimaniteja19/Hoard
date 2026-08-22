import { streamObject } from "ai";
import { z } from "zod";
import { gatewayErrorMessage, gatewayProviderOptions, languageModel } from "@/lib/ai/models";
import { saveAtlas } from "@/lib/dal/atlas";
import { mergeStations } from "./merge";
import { parseAtlas } from "./parse";
import { extractComplete } from "./partial";
import type {
  AtlasRecord,
  AtlasResource,
  AtlasStation,
  AtlasStationDraft,
  AtlasSyllabus,
  AtlasWeekDraft,
  ParsedAtlas,
} from "./types";
import { hydrateStations, validateSyllabus, weeklyBudgetMinutes } from "./validate";

export const ATLAS_MODEL = "google/gemini-3.5-flash";

export type AtlasStreamEvent =
  | { type: "cover"; title: string; brief: string }
  | { type: "week"; week: AtlasWeekDraft }
  | { type: "station"; station: AtlasStationDraft }
  | { type: "thin"; thin: boolean }
  | { type: "resources"; stationId: string; resources: AtlasResource[] }
  | { type: "done" }
  | { type: "error"; message: string };

export type AtlasWireEvent = AtlasStreamEvent | { type: "row"; id: string; serial: string };

type AtlasStreamResult = {
  syllabus: AtlasSyllabus;
  title?: string;
  brief?: string;
};

export const atlasGenerateSchema = z.object({
  title: z.string(),
  brief: z.string(),
  weeks: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      estimatedMinutes: z.number(),
    }),
  ),
  stations: z.array(
    z.object({
      id: z.string(),
      weekId: z.string(),
      title: z.string(),
      why: z.string(),
      estimatedMinutes: z.number(),
      energy: z.enum(["DEEP", "SHALLOW", "ERRAND"]),
      kind: z.enum(["read", "make", "recall", "talk", "ship"]),
      required: z.boolean(),
    }),
  ),
});

const ATLAS_SYSTEM = `You file a walkable syllabus as a single JSON object. No markdown. No preamble.

Hard shape:
- title: short cover title
- brief: one line
- weeks: 3–6 items, each { id, label, estimatedMinutes }
- stations: 3–6 required stations per week, each { id, weekId, title, why, estimatedMinutes, energy, kind, required }

Rules:
- Honor anti-scope. Never put those tokens in titles.
- Mix kinds across the syllabus: read, make, recall, talk, ship. Not all-read.
- why is one line.
- energy is DEEP, SHALLOW, or ERRAND.
- estimatedMinutes is a number (session-sized, usually 15–60).
- required is true unless the station is clearly optional overflow.
- Week labels like "Week 1 — foundations".
- Stable short ids (w1, s1). Never repeat an id you were told to skip.
- Depth tourist = lighter. working = competent. dangerous = closer to the metal, still inside the cap.`;

function emptySyllabus(parsed: ParsedAtlas, existing?: AtlasSyllabus): AtlasSyllabus {
  return {
    thin: false,
    hoursPerWeek: weeklyBudgetMinutes(parsed.minutesPerSession, parsed.cadence) / 60,
    weeks: existing?.weeks ?? [],
    stations: existing?.stations ?? [],
  };
}

function toDrafts(stations: AtlasStation[]): AtlasStationDraft[] {
  return stations.map(({ id, weekId, title, why, estimatedMinutes, energy, kind, required }) => ({
    id,
    weekId,
    title,
    why,
    estimatedMinutes,
    energy,
    kind,
    required,
  }));
}

function assembleSyllabus(
  parsed: ParsedAtlas,
  extracted: ReturnType<typeof extractComplete>,
  existing?: AtlasSyllabus,
): AtlasSyllabus {
  const existingWeeks = existing?.weeks ?? [];
  const existingIds = new Set((existing?.stations ?? []).map((station) => station.id));
  const weekById = new Map<string, AtlasWeekDraft>();
  for (const week of existingWeeks) weekById.set(week.id, week);
  for (const week of extracted.weeks) weekById.set(week.id, week);

  const incoming = [
    ...toDrafts(existing?.stations ?? []),
    ...extracted.stations.filter((station) => !existingIds.has(station.id)),
  ];

  if (incoming.length === 0 && existingWeeks.length === 0 && extracted.weeks.length === 0) {
    return emptySyllabus(parsed, existing);
  }

  const validated = validateSyllabus(
    {
      title: extracted.title ?? "Filing…",
      brief: extracted.brief ?? "",
      antiScope: parsed.antiScope,
      weeks: [...weekById.values()],
      stations: incoming,
    },
    parsed.cadence,
    parsed.minutesPerSession,
  );

  if (existing?.stations.length) {
    return { ...validated, stations: mergeStations(existing.stations, validated.stations) };
  }
  return validated;
}

function userPrompt(parsed: ParsedAtlas, prompt: string, existing?: AtlasSyllabus): string {
  const lines = [
    `Capture: ${prompt}`,
    `Topic: ${parsed.topic}`,
    `Weeks: ${parsed.weeksPlanned}`,
    `Minutes per session: ${parsed.minutesPerSession}`,
    `Cadence: ${parsed.cadence}`,
    `Depth: ${parsed.depth}`,
    `Anti-scope: ${parsed.antiScope.length ? parsed.antiScope.join(", ") : "(none)"}`,
  ];
  if (existing?.stations.length) {
    const ids = existing.stations.map((station) => station.id).join(", ");
    const weekLine = existing.weeks.map((week) => `${week.id} ${week.label}`).join("; ");
    lines.push(`Continue this syllabus, do not repeat ids: ${ids}`);
    if (weekLine) lines.push(`Existing weeks: ${weekLine}`);
  }
  return lines.join("\n");
}

export async function writeAtlasStream(opts: {
  parsed: ParsedAtlas;
  prompt: string;
  existing?: AtlasSyllabus;
  write: (event: AtlasStreamEvent) => void;
}): Promise<AtlasStreamResult> {
  const extracted = {
    title: undefined as string | undefined,
    brief: undefined as string | undefined,
    weeks: [] as AtlasWeekDraft[],
    stations: [] as AtlasStationDraft[],
  };
  const emittedWeeks = new Set((opts.existing?.weeks ?? []).map((week) => week.id));
  const emittedStations = new Set((opts.existing?.stations ?? []).map((station) => station.id));
  let emittedCover = false;

  const publishCover = () => {
    if (emittedCover || extracted.title === undefined || extracted.brief === undefined) return;
    emittedCover = true;
    opts.write({ type: "cover", title: extracted.title, brief: extracted.brief });
  };

  const publish = (next: ReturnType<typeof extractComplete>) => {
    if (next.title !== undefined) extracted.title = next.title;
    if (next.brief !== undefined) extracted.brief = next.brief;
    for (const week of next.weeks) {
      if (!extracted.weeks.some((w) => w.id === week.id)) extracted.weeks.push(week);
    }
    for (const station of next.stations) {
      if (!extracted.stations.some((s) => s.id === station.id)) extracted.stations.push(station);
    }

    if (extracted.weeks.length > 0) publishCover();
    for (const week of extracted.weeks) {
      if (emittedWeeks.has(week.id)) continue;
      emittedWeeks.add(week.id);
      opts.write({ type: "week", week });
    }
    for (const station of extracted.stations) {
      if (emittedStations.has(station.id)) continue;
      emittedStations.add(station.id);
      opts.write({ type: "station", station });
    }
  };

  try {
    const result = streamObject({
      model: languageModel(ATLAS_MODEL),
      schema: atlasGenerateSchema,
      schemaName: "AtlasSyllabus",
      schemaDescription: "A 3-6 week walkable syllabus",
      system: ATLAS_SYSTEM,
      prompt: userPrompt(opts.parsed, opts.prompt, opts.existing),
      maxRetries: 0,
      providerOptions: gatewayProviderOptions(ATLAS_MODEL, ["feature:atlas"]),
    });

    for await (const partial of result.partialObjectStream) {
      publish(extractComplete(partial));
    }
  } catch (err) {
    publishCover();
    opts.write({ type: "error", message: gatewayErrorMessage(err) });
    return {
      syllabus: assembleSyllabus(opts.parsed, extracted, opts.existing),
      title: extracted.title,
      brief: extracted.brief,
    };
  }

  publishCover();
  const syllabus = assembleSyllabus(opts.parsed, extracted, opts.existing);
  opts.write({ type: "thin", thin: syllabus.thin });
  opts.write({ type: "done" });
  return { syllabus, title: extracted.title, brief: extracted.brief };
}

export function atlasNdjsonResponse(run: (write: (event: AtlasWireEvent) => void) => Promise<void>): Response {
  const encoder = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (event: AtlasWireEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          closed = true;
        }
      };
      try {
        await run(write);
      } catch (err) {
        write({ type: "error", message: gatewayErrorMessage(err) });
      } finally {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // client already hung up
        }
      }
    },
    cancel() {
      closed = true;
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

export function parsedFromAtlas(row: Pick<AtlasRecord, "prompt" | "depth" | "cadence" | "antiScope">): ParsedAtlas {
  return parseAtlas(row.prompt, {
    depth: row.depth,
    cadence: row.cadence,
    antiScope: row.antiScope.join(","),
  });
}

export function emptyAtlasSyllabus(parsed: ParsedAtlas): AtlasSyllabus {
  return emptySyllabus(parsed);
}

export async function persistAtlasStream(opts: {
  userId: string;
  row: AtlasRecord;
  parsed: ParsedAtlas;
  prompt: string;
  existing?: AtlasSyllabus;
  write: (event: AtlasStreamEvent) => void;
}): Promise<AtlasSyllabus> {
  let title = opts.row.title;
  let brief = opts.row.brief;
  let weeks = (opts.existing?.weeks ?? []).slice();
  let stations = (opts.existing?.stations ?? []).slice();
  let persistChain = Promise.resolve();

  const persistPartial = () => {
    const snapshot = {
      title,
      brief,
      weeks,
      stations,
      hoursPerWeek: weeklyBudgetMinutes(opts.parsed.minutesPerSession, opts.parsed.cadence) / 60,
    };
    persistChain = persistChain.then(() =>
      saveAtlas(opts.userId, opts.row.id, {
        title: snapshot.title,
        brief: snapshot.brief,
        model: ATLAS_MODEL,
        syllabus: {
          thin: false,
          hoursPerWeek: snapshot.hoursPerWeek,
          weeks: snapshot.weeks,
          stations: snapshot.stations,
        },
      }).then(() => undefined),
    );
  };

  const result = await writeAtlasStream({
    parsed: opts.parsed,
    prompt: opts.prompt,
    existing: opts.existing,
    write: (event) => {
      if (event.type === "cover") {
        title = event.title;
        brief = event.brief;
      } else if (event.type === "week") {
        if (!weeks.some((week) => week.id === event.week.id)) weeks = [...weeks, event.week];
        persistPartial();
      } else if (event.type === "station") {
        if (!stations.some((station) => station.id === event.station.id)) {
          stations = [...stations, hydrateStations([event.station])[0]!];
        }
        persistPartial();
      }
      opts.write(event);
    },
  });

  await persistChain;
  await saveAtlas(opts.userId, opts.row.id, {
    title: result.title ?? title,
    brief: result.brief ?? brief,
    syllabus: result.syllabus,
    model: ATLAS_MODEL,
  });
  return result.syllabus;
}
