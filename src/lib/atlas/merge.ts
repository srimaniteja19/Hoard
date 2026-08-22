import type { AtlasStation, AtlasStationDraft } from "./types";
import { hydrateStations } from "./validate";

export function mergeStations(existing: AtlasStation[], incoming: AtlasStationDraft[]): AtlasStation[] {
  const byId = new Map(existing.map((s) => [s.id, s]));

  return incoming.map((draft) => {
    const prev = byId.get(draft.id);
    if (!prev) return hydrateStations([draft])[0]!;

    const hydrated = hydrateStations([draft])[0]!;
    return {
      ...hydrated,
      title: prev.title,
      why: prev.why,
      state: prev.state,
      note: prev.note,
      doneAt: prev.doneAt,
    };
  });
}
