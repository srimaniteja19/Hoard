/**
 * Day plan — TODOS.md §7.
 *
 * Pure, no imports. Takes `busy: {start,end,title}[]` explicitly (rather
 * than reaching into a busy_blocks table itself) so a calendar adapter can
 * drop in later without touching this function — that's the one thing this
 * phase is checked hardest on. Packs tasks into the day's gaps by the same
 * greedy-descending fill (first-fit decreasing: largest tasks placed first,
 * each into the earliest gap it still fits) as the bookmark session.
 */

export type BusyBlock = { start: string; end: string; title: string }; // "HH:mm"
export type DayPlanTask = { id: string; title: string; estimatedMinutes: number };
export type Gap = { start: string; end: string; minutes: number };
export type PackedTask = DayPlanTask & { gapIndex: number };

export type DayPlanResult = {
  gaps: Gap[];
  packed: PackedTask[];
  unfitted: DayPlanTask[];
  freeMinutes: number;
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function toHHmm(minutes: number): string {
  // A day boundary (e.g. dayEndMinutes = 1440) reads as "24:00", not the
  // technically-correct-but-confusing "00:00" of the next day.
  if (minutes > 0 && minutes % (24 * 60) === 0) return "24:00";
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Merges overlapping/adjacent busy blocks — user-entered blocks can overlap. */
function mergeBusy(busy: BusyBlock[]): { start: number; end: number }[] {
  const intervals = busy
    .map((b) => ({ start: toMinutes(b.start), end: toMinutes(b.end) }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [];
  for (const iv of intervals) {
    const last = merged[merged.length - 1];
    if (last && iv.start <= last.end) {
      last.end = Math.max(last.end, iv.end);
    } else {
      merged.push({ ...iv });
    }
  }
  return merged;
}

/**
 * Computes today's gaps between `nowMinutes` and `dayEndMinutes` (default
 * end of day), subtracting busy blocks, then greedy-fills them with tasks.
 */
export function computeDayPlan(
  busy: BusyBlock[],
  tasks: DayPlanTask[],
  nowMinutes: number,
  dayEndMinutes: number = 24 * 60
): DayPlanResult {
  const merged = mergeBusy(busy);
  const dayStart = Math.max(0, Math.min(nowMinutes, dayEndMinutes));

  const gaps: Gap[] = [];
  let cursor = dayStart;
  for (const block of merged) {
    if (block.start >= dayEndMinutes) break;
    if (block.end <= cursor) continue; // entirely in the past — no gap to clip
    if (block.start > cursor) {
      const gapEnd = Math.min(block.start, dayEndMinutes);
      gaps.push({ start: toHHmm(cursor), end: toHHmm(gapEnd), minutes: gapEnd - cursor });
    }
    cursor = Math.max(cursor, block.end);
  }
  if (cursor < dayEndMinutes) {
    gaps.push({ start: toHHmm(cursor), end: toHHmm(dayEndMinutes), minutes: dayEndMinutes - cursor });
  }

  const remaining = gaps.map((g) => g.minutes);
  const packed: PackedTask[] = [];
  const unfitted: DayPlanTask[] = [];

  const bySizeDesc = [...tasks].sort((a, b) => b.estimatedMinutes - a.estimatedMinutes);
  for (const task of bySizeDesc) {
    const gapIndex = remaining.findIndex((r) => r >= task.estimatedMinutes);
    if (gapIndex === -1) {
      unfitted.push(task);
    } else {
      remaining[gapIndex] -= task.estimatedMinutes;
      packed.push({ ...task, gapIndex });
    }
  }

  const freeMinutes = gaps.reduce((sum, g) => sum + g.minutes, 0);

  return { gaps, packed, unfitted, freeMinutes };
}
