import { describe, expect, it } from "vitest";
import { mergeStations } from "./merge";
import { hydrateStations } from "./validate";

it("keeps existing done/note and appends new ids", () => {
  const existing = hydrateStations([
    { id: "a", weekId: "w1", title: "Old", why: "x", estimatedMinutes: 20, energy: "DEEP", kind: "read", required: true },
  ]).map((s) => ({ ...s, state: "DONE" as const, note: "filed", doneAt: "2026-08-21T00:00:00.000Z" }));
  const incoming = [
    { id: "a", weekId: "w1", title: "New title", why: "y", estimatedMinutes: 20, energy: "DEEP" as const, kind: "read" as const, required: true },
    { id: "b", weekId: "w1", title: "Next", why: "z", estimatedMinutes: 15, energy: "SHALLOW" as const, kind: "make" as const, required: true },
  ];
  const out = mergeStations(existing, incoming);
  expect(out).toHaveLength(2);
  expect(out[0]).toMatchObject({ id: "a", title: "Old", state: "DONE", note: "filed" });
  expect(out[1]).toMatchObject({ id: "b", state: "OPEN", note: null });
});
