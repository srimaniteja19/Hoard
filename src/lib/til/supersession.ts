import { db } from "@/db";
import { tilEntries } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const MAX_SUPERSESSION_DEPTH = 10;

/**
 * Pure in-memory cycle detection logic.
 *
 * @param olderEntryId      The ID of the entry being marked as superseded.
 * @param newReplacementId  The ID of the entry that replaces it.
 * @param lookup            Function returning the `supersededById` for any entry ID.
 * @param maxDepth          Maximum chain depth (defaults to 10).
 */
export function checkCycleInMemory(
  olderEntryId: string,
  newReplacementId: string,
  lookup: (id: string) => string | null | undefined,
  maxDepth = MAX_SUPERSESSION_DEPTH
): { hasCycle: boolean; reason?: string } {
  if (olderEntryId === newReplacementId) {
    return { hasCycle: true, reason: "An entry cannot supersede itself." };
  }

  let currentId: string | null = newReplacementId;
  let depth = 0;
  const visited = new Set<string>([olderEntryId]);

  while (currentId && depth < maxDepth) {
    if (visited.has(currentId)) {
      return {
        hasCycle: true,
        reason: `Supersession cycle detected: chain creates a loop involving entry #${currentId.slice(0, 4)}.`,
      };
    }
    visited.add(currentId);
    currentId = lookup(currentId) || null;
    depth++;
  }

  if (depth >= maxDepth) {
    return {
      hasCycle: true,
      reason: `Supersession depth limit exceeded (max ${maxDepth}).`,
    };
  }

  return { hasCycle: false };
}

/**
 * Checks if setting `olderEntryId.supersededById = newReplacementId` in DB would create a cycle.
 */
export async function checkSupersessionCycle(
  olderEntryId: string,
  newReplacementId: string,
  userId: string
): Promise<{ hasCycle: boolean; reason?: string }> {
  if (olderEntryId === newReplacementId) {
    return { hasCycle: true, reason: "An entry cannot supersede itself." };
  }

  const lookupMap = new Map<string, string | null>();

  const lookup = async (id: string): Promise<string | null> => {
    if (lookupMap.has(id)) return lookupMap.get(id) ?? null;
    const [row] = await db
      .select({ id: tilEntries.id, supersededById: tilEntries.supersededById })
      .from(tilEntries)
      .where(and(eq(tilEntries.id, id), eq(tilEntries.userId, userId)))
      .limit(1);
    const result = row?.supersededById ?? null;
    lookupMap.set(id, result);
    return result;
  };

  let currentId: string | null = newReplacementId;
  let depth = 0;
  const visited = new Set<string>([olderEntryId]);

  while (currentId && depth < MAX_SUPERSESSION_DEPTH) {
    if (visited.has(currentId)) {
      return {
        hasCycle: true,
        reason: `Supersession cycle detected: chain creates a loop involving entry #${currentId.slice(0, 4)}.`,
      };
    }
    visited.add(currentId);
    currentId = await lookup(currentId);
    depth++;
  }

  if (depth >= MAX_SUPERSESSION_DEPTH) {
    return {
      hasCycle: true,
      reason: `Supersession depth limit exceeded (max ${MAX_SUPERSESSION_DEPTH}).`,
    };
  }

  return { hasCycle: false };
}

/**
 * Resolves terminal replacement info for a superseded entry chain up to depth 10.
 */
export async function resolveTerminalReplacement(
  startSupersededById: string,
  userId: string
): Promise<{ id: string; shortHash: string } | null> {
  let currentId: string | null = startSupersededById;
  let depth = 0;
  let lastRow: { id: string; shortHash: string; supersededById: string | null } | null = null;
  const visited = new Set<string>();

  while (currentId && depth < MAX_SUPERSESSION_DEPTH) {
    if (visited.has(currentId)) break;
    visited.add(currentId);

    const [row] = await db
      .select({
        id: tilEntries.id,
        shortHash: tilEntries.shortHash,
        supersededById: tilEntries.supersededById,
      })
      .from(tilEntries)
      .where(and(eq(tilEntries.id, currentId), eq(tilEntries.userId, userId)))
      .limit(1);

    if (!row) break;
    lastRow = row;
    currentId = row.supersededById;
    depth++;
  }

  if (!lastRow) return null;
  return { id: lastRow.id, shortHash: lastRow.shortHash };
}
