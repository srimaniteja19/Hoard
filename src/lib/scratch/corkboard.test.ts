import { describe, it, expect } from "vitest";
import { getBoardPosition, getWeldConnections } from "./corkboard";
import { ScrapRow } from "@/db/schema";

function mockScrap(partial: Partial<ScrapRow>): ScrapRow {
  return {
    id: "s1",
    userId: "u1",
    content: "Sample content",
    kind: "FRAGMENT",
    color: "cyan",
    tilt: "0deg",
    notes: "",
    status: "raw",
    statusLabel: "RAW",
    promotedTo: null,
    promotedId: null,
    threadN: 0,
    threadSummary: null,
    weldedToId: null,
    loggedFor: "2026-08-23",
    occurredOn: "2026-08-23",
    entities: {},
    tags: [],
    isBuried: false,
    buriedAt: null,
    createdAt: new Date("2026-08-23T10:00:00Z"),
    updatedAt: new Date("2026-08-23T10:00:00Z"),
    ...partial,
  };
}

describe("getBoardPosition", () => {
  it("uses stored boardX/boardY when present", () => {
    const scrap = mockScrap({ entities: { boardX: 240, boardY: 80 } });
    expect(getBoardPosition(scrap, 0)).toEqual({ x: 240, y: 80 });
  });

  it("falls back to a deterministic scattered position when unset", () => {
    const scrap = mockScrap({ id: "abc-123", entities: {} });
    const a = getBoardPosition(scrap, 0);
    const b = getBoardPosition(scrap, 0);
    expect(a).toEqual(b);
    expect(a.x).toBeGreaterThanOrEqual(0);
    expect(a.y).toBeGreaterThanOrEqual(0);
  });

  it("gives different fallback positions to different scraps at the same index", () => {
    const a = getBoardPosition(mockScrap({ id: "aaa" }), 0);
    const b = getBoardPosition(mockScrap({ id: "zzz" }), 0);
    expect(a).not.toEqual(b);
  });

  it("only uses boardX/boardY when both are set", () => {
    const scrap = mockScrap({ entities: { boardX: 240 } });
    const fallback = getBoardPosition(mockScrap({ id: scrap.id, entities: {} }), 0);
    expect(getBoardPosition(scrap, 0)).toEqual(fallback);
  });
});

describe("getWeldConnections", () => {
  it("connects a pinned scrap to the pinned scrap it was welded onto", () => {
    const target = mockScrap({ id: "target", entities: { isPinned: true } });
    const source = mockScrap({
      id: "source",
      entities: { isPinned: true },
      weldedToId: "target",
    });
    const connections = getWeldConnections([target, source]);
    expect(connections).toEqual([{ from: "source", to: "target" }]);
  });

  it("excludes connections where the welded-to scrap is not pinned", () => {
    const target = mockScrap({ id: "target", entities: { isPinned: false } });
    const source = mockScrap({
      id: "source",
      entities: { isPinned: true },
      weldedToId: "target",
    });
    expect(getWeldConnections([target, source])).toEqual([]);
  });

  it("excludes connections where the welded-to scrap doesn't exist in the list", () => {
    const source = mockScrap({
      id: "source",
      entities: { isPinned: true },
      weldedToId: "missing",
    });
    expect(getWeldConnections([source])).toEqual([]);
  });

  it("returns no connections when weldedToId is null", () => {
    const a = mockScrap({ id: "a", entities: { isPinned: true } });
    const b = mockScrap({ id: "b", entities: { isPinned: true } });
    expect(getWeldConnections([a, b])).toEqual([]);
  });
});
