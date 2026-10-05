import { describe, expect, it } from "vitest";
import { addPart, attachPiece, movePart, movePieceTo, removePart } from "./series";

const parts = [
  { n: 1, title: "One", pieceId: "a" },
  { n: 2, title: "Two", pieceId: null },
  { n: 3, title: "Three", pieceId: null },
];

describe("studio series parts", () => {
  it("keeps next on the same part when moving", () => {
    const r = movePart(parts, 3, -1, 3);
    expect(r.parts.map((p) => p.title)).toEqual(["One", "Three", "Two"]);
    expect(r.nextPart).toBe(2);
  });

  it("renumbers after removing", () => {
    const r = removePart(parts, 1, 2);
    expect(r.parts.map((p) => [p.n, p.title])).toEqual([[1, "Two"], [2, "Three"]]);
    expect(r.nextPart).toBe(1);
  });

  it("claims a planned part with the same title, else appends", () => {
    expect(attachPiece(parts, { id: "b", title: "two" }).part).toBe(2);
    const r = attachPiece(parts, { id: "c", title: "Other" });
    expect(r.part).toBe(4);
    expect(r.parts).toHaveLength(4);
  });

  it("adds and moves a piece to a position", () => {
    expect(addPart(parts, "Four").at(-1)).toMatchObject({ n: 4, title: "Four" });
    const r = movePieceTo(parts, "a", 3, 1);
    expect(r.parts.map((p) => p.title)).toEqual(["Two", "Three", "One"]);
    expect(r.nextPart).toBe(3);
  });

  it("detaches piece when disbanding or unlinking part", () => {
    const detached = parts.map((p) => (p.pieceId === "a" ? { ...p, pieceId: null } : p));
    expect(detached[0].pieceId).toBeNull();
  });
});
