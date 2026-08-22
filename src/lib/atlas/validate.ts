import type {
  AtlasCadence,
  AtlasKind,
  AtlasStation,
  AtlasStationDraft,
  AtlasSyllabus,
  AtlasWeekDraft,
} from "./types";

export const SESSIONS_PER_CADENCE: Record<AtlasCadence, number> = {
  weeknights: 5,
  weekends: 2,
  daily: 7,
};

export function weeklyBudgetMinutes(minutesPerSession: number, cadence: AtlasCadence): number {
  return minutesPerSession * SESSIONS_PER_CADENCE[cadence];
}

export function hydrateStations(draft: AtlasStationDraft[]): AtlasStation[] {
  return draft.map((d) => ({
    ...d,
    estimatedMinutes: Math.max(5, d.estimatedMinutes),
    state: "OPEN" as const,
    note: null,
    doneAt: null,
  }));
}

export function isThin(
  syllabus: { stations: Array<{ kind: AtlasKind; title: string }> },
  antiScope: string[]
): boolean {
  const { stations } = syllabus;

  if (stations.every((s) => s.kind === "read")) return true;

  const kinds = new Set(stations.map((s) => s.kind));
  if (kinds.size < 2) return true;

  const tokens = antiScope.map((t) => t.toLowerCase());
  for (const station of stations) {
    const title = station.title.toLowerCase();
    if (tokens.some((token) => title.includes(token))) return true;
  }

  return false;
}

export function validateSyllabus(
  draft: {
    title: string;
    brief: string;
    antiScope: string[];
    weeks: AtlasWeekDraft[];
    stations: AtlasStationDraft[];
  },
  cadence: AtlasCadence,
  minutesPerSession: number
): AtlasSyllabus {
  const weeks = draft.weeks.slice(0, 6);
  const weekIds = new Set(weeks.map((w) => w.id));

  const byWeek = new Map<string, AtlasStationDraft[]>();
  for (const station of draft.stations) {
    if (!weekIds.has(station.weekId)) continue;
    const list = byWeek.get(station.weekId) ?? [];
    list.push(station);
    byWeek.set(station.weekId, list);
  }

  const kept: AtlasStationDraft[] = [];
  for (const week of weeks) {
    const weekStations = byWeek.get(week.id) ?? [];
    kept.push(
      ...weekStations.filter((s) => s.required).slice(0, 6),
      ...weekStations.filter((s) => !s.required)
    );
  }

  const stations = hydrateStations(kept);
  const weeksWithMinutes = weeks.map((week) => ({
    ...week,
    estimatedMinutes: stations
      .filter((s) => s.weekId === week.id)
      .reduce((sum, s) => sum + s.estimatedMinutes, 0),
  }));

  const budget = weeklyBudgetMinutes(minutesPerSession, cadence);

  return {
    thin: isThin({ stations }, draft.antiScope),
    hoursPerWeek: budget / 60,
    weeks: weeksWithMinutes,
    stations,
  };
}
