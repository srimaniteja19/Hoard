import { describe, expect, it } from "vitest";
import { applyArchive, applyPin, applyRestore, applyStationPatch, canRegenerate, listForDesk } from "./apply";
import { hydrateStations } from "./validate";
import type { AtlasRecord, AtlasSyllabus } from "./types";

const now = "2026-08-21T18:00:00.000Z";
const syllabus: AtlasSyllabus = {
  thin: false,
  hoursPerWeek: 3.75,
  weeks: [{ id: "w1", label: "W1", estimatedMinutes: 20 }],
  stations: hydrateStations([
    { id: "a", weekId: "w1", title: "A", why: "x", estimatedMinutes: 20, energy: "DEEP", kind: "read", required: true },
  ]),
};

describe("applyStationPatch", () => {
  it("checks, unchecks (keeps note), and returns null for unknown id", () => {
    const done = applyStationPatch(syllabus, "a", { state: "DONE", note: "ok" }, now);
    expect(done?.stations[0]).toMatchObject({ state: "DONE", note: "ok", doneAt: now });
    const reopened = applyStationPatch(done!, "a", { state: "OPEN" }, now);
    expect(reopened?.stations[0]).toMatchObject({ state: "OPEN", note: "ok", doneAt: null });
    expect(applyStationPatch(syllabus, "nope", { state: "DONE" }, now)).toBeNull();
  });
});

describe("archive/restore/pin/regen", () => {
  it("restore is walking if any station is DONE, else draft", () => {
    expect(applyRestore("archived", syllabus)).toBe("draft");
    const walkingSyl = applyStationPatch(syllabus, "a", { state: "DONE" }, now)!;
    expect(applyRestore("archived", walkingSyl)).toBe("walking");
    expect(applyArchive("walking")).toBe("archived");
    expect(applyPin("w1", syllabus)).toBe("w1");
    expect(applyPin("missing", syllabus)).toBeNull();
    expect(canRegenerate("draft")).toBe(true);
    expect(canRegenerate("walking")).toBe(false);
  });
});

describe("listForDesk", () => {
  it("walking then drafts when not archived; only archived when asked", () => {
    const row = (id: string, status: AtlasRecord["status"]): AtlasRecord => ({
      id, serial: "ATL-0001", title: id, brief: "", prompt: "", depth: "working",
      cadence: "weeknights", minutesPerSession: 45, weeksPlanned: 4, antiScope: [],
      status, currentWeekId: null, syllabus, model: "", createdAt: now, updatedAt: now,
    });
    const rows = [row("d", "draft"), row("w", "walking"), row("a", "archived")];
    expect(listForDesk(rows, false).map((r) => r.id)).toEqual(["w", "d"]);
    expect(listForDesk(rows, true).map((r) => r.id)).toEqual(["a"]);
  });
});
