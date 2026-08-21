import { describe, expect, it } from "vitest";
import { fuseSearchLists } from "./fuseSearchLists";

type Hit = { id: number; useCount: number; title: string };

function hit(id: number, useCount: number): Hit {
  return { id, useCount, title: `item-${id}` };
}

describe("fuseSearchLists", () => {
  it("includes a vector-only neighbor that FTS missed (conceptual hit, no keyword overlap)", () => {
    const fts = [hit(1, 3)];
    const vector = [hit(2, 1), hit(1, 3)];

    const fused = fuseSearchLists(fts, vector);

    expect(fused.map((r) => r.id)).toContain(2);
  });

  it("ranks a higher useCount above a lower one when both lists treat them equally", () => {
    // Same FTS order and same vector order — RRF scores match; useCount must break the tie.
    const fts = [hit(10, 0), hit(20, 80)];
    const vector = [hit(10, 0), hit(20, 80)];

    const fused = fuseSearchLists(fts, vector);

    expect(fused[0].id).toBe(20);
    expect(fused[1].id).toBe(10);
  });

  it("falls back to FTS order with useCount damping when the vector list is empty (Gateway failure)", () => {
    const fts = [hit(1, 0), hit(2, 80)];

    const fused = fuseSearchLists(fts, []);

    expect(fused.map((r) => r.id)).toEqual([2, 1]);
  });
});
