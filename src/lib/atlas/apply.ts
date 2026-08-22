import type { AtlasRecord, AtlasStatus, AtlasSyllabus } from "./types";

const DESK_STATUS_ORDER: Record<AtlasStatus, number> = {
  walking: 0,
  draft: 1,
  archived: 2,
};

export function applyStationPatch(
  syllabus: AtlasSyllabus,
  stationId: string,
  patch: { state?: "OPEN" | "DONE"; note?: string | null },
  nowIso: string
): AtlasSyllabus | null {
  const index = syllabus.stations.findIndex((s) => s.id === stationId);
  if (index === -1) return null;

  const station = syllabus.stations[index];
  const next = { ...station };

  if (patch.state === "DONE") {
    next.state = "DONE";
    next.doneAt = nowIso;
  } else if (patch.state === "OPEN") {
    next.state = "OPEN";
    next.doneAt = null;
  }

  if (patch.note !== undefined) {
    next.note = patch.note === "" ? null : patch.note;
  }

  const stations = syllabus.stations.slice();
  stations[index] = next;

  return { ...syllabus, stations };
}

export function applyArchive(status: AtlasStatus): "archived" {
  void status;
  return "archived";
}

export function applyRestore(status: AtlasStatus, syllabus: AtlasSyllabus): "draft" | "walking" {
  void status;
  return syllabus.stations.some((s) => s.state === "DONE") ? "walking" : "draft";
}

export function applyPin(weekId: string, syllabus: AtlasSyllabus): string | null {
  return syllabus.weeks.some((w) => w.id === weekId) ? weekId : null;
}

export function canRegenerate(status: AtlasStatus): boolean {
  return status === "draft";
}

export function listForDesk(rows: AtlasRecord[], archived: boolean): AtlasRecord[] {
  const filtered = rows.filter((row) => (archived ? row.status === "archived" : row.status !== "archived"));

  if (archived) return filtered;

  return filtered
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const byStatus = DESK_STATUS_ORDER[a.row.status] - DESK_STATUS_ORDER[b.row.status];
      if (byStatus !== 0) return byStatus;
      const byUpdated = b.row.updatedAt.localeCompare(a.row.updatedAt);
      if (byUpdated !== 0) return byUpdated;
      return a.index - b.index;
    })
    .map(({ row }) => row);
}
