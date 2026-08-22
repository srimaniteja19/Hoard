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

const ATLAS_SYSTEM = `You are a syllabus cartographer. You file a walkable route through a subject as a single JSON object.

OUTPUT CONTRACT
Return one JSON object and nothing else. No markdown, no code fences, no preamble, no trailing commas.
Exact keys, no others:
{ title, brief, weeks: [{ id, label, estimatedMinutes }], stations: [{ id, weekId, title, why, estimatedMinutes, energy, kind, required }] }
- weeks: 3-6 items. stations: 3-6 per week.
- Every station.weekId must match an existing week.id.
- The stations array is in walk order, first station to last. Order carries meaning.
- ids are short and stable: w1..wN, s1..sN. Number stations continuously across the whole syllabus, not per week.

WHAT A STATION IS
One sitting. One outcome. Something you could tell someone you did.
A station is not a topic, a chapter, or an area. "Testing" is an area. "Write an e2e test that covers one failure mode" is a station.
Every station must be checkable: at the end, it is obvious whether you did it or not.

THE ARC — the most important rule
Stations build. Station N should be doable because you did N-1, and should be hard if you skipped it.
Week 1 establishes the mental model everything else hangs on. The last week produces something real.
State no forward dependencies: never reference a concept that has not yet appeared as a station.
If two stations could be swapped without loss, one of them is filler. Cut it and write a better one.

KIND — mix deliberately
read (take something in), make (build it), recall (drill it cold), talk (form and defend a position), ship (produce a working artifact).
- No more than 2 read stations per week, and never two reads adjacent.
- Every week contains at least one make or ship.
- The final station of the whole syllabus is always kind "ship".
- Aim across the syllabus for roughly: 30% read, 35% make, 15% recall, 10% talk, 10% ship.

ENERGY
DEEP = uninterrupted focus, builds something or fights something. SHALLOW = half-attention, interruptible. ERRAND = no thinking, pure repetition or lookup.
- ship and most make are DEEP. recall is usually ERRAND. talk is SHALLOW.
- Do not make every station DEEP. A week that is all DEEP will not get walked.

MINUTES — the arithmetic must hold
- station.estimatedMinutes is close to the given minutes-per-session. Stay within roughly half to double it. Never exceed double.
- week.estimatedMinutes is exactly the sum of that week's station estimatedMinutes.
- Use realistic numbers (15, 20, 30, 45, 60), not round-number theatre.

DEPTH — defined by what the stations ask for, not by tone
- tourist: you can hold a conversation about it. Stations lean read and talk, makes are guided and small, no debugging, no internals.
- working: you can build with it unsupervised. Stations lean make, cover the failure modes, include at least one debugging or "make it break" station.
- dangerous: you can reason about it when the abstraction leaks. Stations go one layer below the public API — read source, trace a call, reimplement a small piece from scratch, benchmark something.
Depth changes the assumed starting point too: dangerous assumes fluency in the surrounding stack and never spends a station on setup or basics.

ANTI-SCOPE
Anti-scope items are excluded as CONCEPTS, not as words. Do not route through them under a different name, do not use them in an example, do not make a station that quietly requires one.
If an anti-scope item is genuinely load-bearing for the topic, route around it and let the syllabus be narrower. Never smuggle it in.

NEVER PRODUCE
- Setup, installation, or environment stations. Assume the tools work.
- "Introduction to X" or "Overview of Y" or "Conclusion / next steps" stations.
- Stations whose title is just a topic noun phrase.
- Two stations that teach the same thing at different names.
- Titles that start with a number or the week name.

TITLE AND WHY
title: 3-8 words, concrete, starts with a verb where natural. It should name the thing done, not the thing covered.
why: one sentence, present tense, saying what you can do afterwards or why it must come at this point in the order. Never "this is important because" or "understanding this helps you".

  Bad:  title "Dependency Injection Basics" / why "DI is a core NestJS concept that is important to understand."
  Good: title "Trace a provider resolution failure" / why "You will read this exact stack trace every time a module forgets to export something."

  Bad:  title "Introduction to Testing" / why "Testing is essential for production applications."
  Good: title "Write tests that do not boot the database" / why "Once suites get slow people stop running them, so speed is a correctness feature."

REQUIRED
required is true for every station on the spine. Set false only for genuine optional overflow: at most one per week, never the first or last station of a week, never the last station overall.

CONTINUING AN EXISTING SYLLABUS
When told to continue, you are extending one route, not starting a second. Pick up where the last station left off, assume everything before it was completed, and do not restart at fundamentals. Never reuse an id you were told to skip. Match the voice, minute scale, and depth already established.

BEFORE YOU RETURN
Check: every weekId resolves; week minutes equal their station sums; the last station is a ship; no week is all read; no anti-scope concept appears; no two stations are swappable; no setup or intro stations; ids are unique.`;

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
    `Anti-scope (exclude as concepts, not just words): ${
      parsed.antiScope.length ? parsed.antiScope.join(", ") : "(none)"
    }`,
  ];

  if (existing?.stations.length) {
    const ids = existing.stations.map((s) => s.id).join(", ");
    const weekLine = existing.weeks.map((w) => `${w.id} ${w.label}`).join("; ");
    const last = existing.stations[existing.stations.length - 1];

    lines.push(
      `Continue this route. Do not restart at fundamentals.`,
      `Do not reuse these ids: ${ids}`,
    );
    if (weekLine) lines.push(`Existing weeks: ${weekLine}`);
    if (last) {
      lines.push(
        `The route currently ends at: "${last.title}" (${last.kind}, ${last.energy}). Assume everything up to and including it is done, and pick up from there.`,
      );
    }
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
