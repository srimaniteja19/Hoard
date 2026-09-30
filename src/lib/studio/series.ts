import type { StudioPart } from "./types";

export type PartState = "planned" | "writing" | "recording" | "making" | "ready" | "posted";

export function sortParts(parts: StudioPart[]): StudioPart[] {
  return [...parts].sort((a, b) => a.n - b.n);
}

/** Renumber parts 1..n in the given order, keeping "next" on the same part. */
export function renumber(ordered: StudioPart[], nextPart: number): { parts: StudioPart[]; nextPart: number } {
  let next = 0;
  const parts = ordered.map((p, i) => {
    if (p.n === nextPart) next = i + 1;
    return { ...p, n: i + 1 };
  });
  if (!next) next = Math.min(Math.max(nextPart, 1), Math.max(parts.length, 1));
  return { parts, nextPart: next };
}

export function movePart(parts: StudioPart[], n: number, delta: number, nextPart: number) {
  const list = sortParts(parts);
  const i = list.findIndex((p) => p.n === n);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return { parts: list, nextPart };
  [list[i], list[j]] = [list[j], list[i]];
  return renumber(list, nextPart);
}

export function removePart(parts: StudioPart[], n: number, nextPart: number) {
  return renumber(sortParts(parts).filter((p) => p.n !== n), nextPart);
}

export function addPart(parts: StudioPart[], title: string): StudioPart[] {
  const list = sortParts(parts);
  return [...list, { n: list.length + 1, title, summary: "", pieceId: null }];
}

/**
 * Attach a piece to a series. A planned part with the same title is claimed;
 * otherwise the piece becomes a new last part. Returns the new parts and the piece's part number.
 */
export function attachPiece(parts: StudioPart[], piece: { id: string; title: string }): { parts: StudioPart[]; part: number } {
  const list = sortParts(parts).map((p) => ({ ...p }));
  const existing = list.find((p) => p.pieceId === piece.id);
  if (existing) return { parts: list, part: existing.n };
  const key = piece.title.trim().toLowerCase();
  const match = list.find((p) => !p.pieceId && p.title.trim().toLowerCase() === key);
  if (match) {
    match.pieceId = piece.id;
    return { parts: list, part: match.n };
  }
  const n = list.length + 1;
  return { parts: [...list, { n, title: piece.title, summary: "", pieceId: piece.id }], part: n };
}

export function detachPiece(parts: StudioPart[], pieceId: string): StudioPart[] {
  return parts.map((p) => (p.pieceId === pieceId ? { ...p, pieceId: null } : p));
}

/** Move a piece's part to position `to` (1-based). */
export function movePieceTo(parts: StudioPart[], pieceId: string, to: number, nextPart: number) {
  const list = sortParts(parts);
  const i = list.findIndex((p) => p.pieceId === pieceId);
  if (i < 0) return { parts: list, nextPart };
  const [moved] = list.splice(i, 1);
  list.splice(Math.max(0, Math.min(list.length, to - 1)), 0, moved);
  return renumber(list, nextPart);
}

/**
 * Put a piece at part `n` when that part is free (or already this piece's); otherwise fall back to
 * `attachPiece`. With `advance` (the piece is ready or posted), "next" moves past the placed part.
 */
export function placePiece(
  parts: StudioPart[],
  piece: { id: string; title: string },
  n: number | undefined,
  nextPart: number,
  advance = true
): { parts: StudioPart[]; part: number; nextPart: number } {
  const list = detachPiece(sortParts(parts), piece.id).map((p) => ({ ...p }));
  const slot = n ? list.find((p) => p.n === n) : undefined;
  let placed: { parts: StudioPart[]; part: number };
  if (slot && !slot.pieceId) {
    slot.pieceId = piece.id;
    placed = { parts: list, part: slot.n };
  } else if (n && !slot && n === list.length + 1) {
    placed = { parts: [...list, { n, title: piece.title, summary: "", pieceId: piece.id }], part: n };
  } else {
    placed = attachPiece(list, piece);
  }
  return { ...placed, nextPart: advance && nextPart <= placed.part ? placed.part + 1 : nextPart };
}
