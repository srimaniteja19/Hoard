/**
 * Todo list partitioning — TODOS.md §3/§4.
 *
 * Pure, no imports beyond ./types — same discipline as parse.ts and
 * recurrence.ts. `today` is passed in rather than read internally (no
 * `new Date()` in here) so the caller owns "what time is it," matching how
 * parseTodo takes a Date parameter instead of reading the clock itself.
 *
 * The time/energy filter narrows every section except `totalOpen`, which
 * always counts every OPEN todo regardless of filter — it answers "is there
 * anything left today at all," not "is there anything left given the
 * current filter."
 */

import { Energy } from "./parse";
import { Todo } from "./types";

export type Sections = {
  overdue: Todo[];
  dueToday: Todo[];
  thisWeek: Todo[];
  later: Todo[];
  someday: Todo[];
  doneToday: Todo[];
  totalOpen: number;
};

export type SeriesStats = { done: number; missed: number; run: number };

function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function localDateFromIso(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function sectionTodos(
  todos: Todo[],
  { today, time, energyFilter }: { today: string; time: number; energyFilter: Energy | "ALL" }
): Sections {
  const weekEnd = addDaysToDateStr(today, 7);

  const filtered = todos.filter((t) => {
    if (energyFilter !== "ALL" && t.energy !== energyFilter) return false;
    if (time < 180 && t.estimatedMinutes > time) return false;
    return true;
  });

  return {
    overdue: filtered.filter((t) => t.state === "OPEN" && t.dueDate !== null && t.dueDate < today),
    dueToday: filtered.filter((t) => t.state === "OPEN" && t.dueDate === today),
    thisWeek: filtered.filter(
      (t) => t.state === "OPEN" && t.dueDate !== null && t.dueDate > today && t.dueDate <= weekEnd
    ),
    later: filtered.filter((t) => t.state === "OPEN" && t.dueDate !== null && t.dueDate > weekEnd),
    someday: filtered.filter((t) => t.state === "OPEN" && t.dueDate === null),
    doneToday: filtered.filter(
      (t) => t.state === "DONE" && t.completedAt !== null && localDateFromIso(t.completedAt) === today
    ),
    totalOpen: todos.filter((t) => t.state === "OPEN").length,
  };
}

/** "standup notes, 47 done, 3 missed, 14-day run" — TODOS.md §5. Computed
 * from the already-fetched list (every non-graveyard instance in the
 * series), not a separate query. */
export function computeSeriesStats(allTodos: Todo[], rootId: string): SeriesStats {
  const series = allTodos
    .filter((t) => t.id === rootId || t.recurrenceParentId === rootId)
    .sort((a, b) => (a.seriesPosition ?? 0) - (b.seriesPosition ?? 0));

  const done = series.filter((t) => t.state === "DONE").length;
  const missed = series.filter((t) => t.state === "DROPPED").length;

  let run = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].state === "DONE") run++;
    else if (series[i].state === "OPEN") continue; // the current open instance doesn't break a run
    else break;
  }

  return { done, missed, run };
}
