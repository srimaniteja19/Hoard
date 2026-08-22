import type { AtlasEnergy, AtlasKind, AtlasStationDraft, AtlasWeekDraft } from "./types";

const ENERGIES = new Set<AtlasEnergy>(["DEEP", "SHALLOW", "ERRAND"]);
const KINDS = new Set<AtlasKind>(["read", "make", "recall", "talk", "ship"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function completeWeek(value: unknown): AtlasWeekDraft | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  const label = asString(value.label);
  if (!id || !label) return null;
  if (typeof value.estimatedMinutes !== "number") return null;
  return {
    id,
    label,
    estimatedMinutes: value.estimatedMinutes,
  };
}

function completeStation(value: unknown): AtlasStationDraft | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  const weekId = asString(value.weekId);
  const title = asString(value.title);
  const why = asString(value.why);
  const energy = asString(value.energy);
  const kind = asString(value.kind);
  if (!id || !weekId || !title || !why) return null;
  if (typeof value.estimatedMinutes !== "number") return null;
  if (typeof value.required !== "boolean") return null;
  if (!energy || !ENERGIES.has(energy as AtlasEnergy)) return null;
  if (!kind || !KINDS.has(kind as AtlasKind)) return null;
  return {
    id,
    weekId,
    title,
    why,
    estimatedMinutes: value.estimatedMinutes,
    energy: energy as AtlasEnergy,
    kind: kind as AtlasKind,
    required: value.required,
  };
}

export function extractComplete(partial: unknown): {
  title?: string;
  brief?: string;
  weeks: AtlasWeekDraft[];
  stations: AtlasStationDraft[];
} {
  if (!isRecord(partial)) return { weeks: [], stations: [] };

  const title = asString(partial.title);
  const brief = asString(partial.brief);
  const weeks = Array.isArray(partial.weeks)
    ? partial.weeks.map(completeWeek).filter((week): week is AtlasWeekDraft => week !== null)
    : [];
  const stations = Array.isArray(partial.stations)
    ? partial.stations.map(completeStation).filter((station): station is AtlasStationDraft => station !== null)
    : [];

  return {
    ...(title !== undefined ? { title } : {}),
    ...(brief !== undefined ? { brief } : {}),
    weeks,
    stations,
  };
}
