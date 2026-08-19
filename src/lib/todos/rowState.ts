/**
 * Per-todo derived display state — TODOS.md §4.
 *
 * Pure, no imports beyond ./types. Sibling to sections.ts but a different
 * shape of rule: sections.ts partitions a *list*, this classifies a single
 * todo. `today` is passed in, same discipline as sections.ts.
 */

import { Todo } from "./types";

/** rolloverCount at which a row gets the "moved N times" stale marker. */
const STALE_THRESHOLD = 3;

/** rolloverCount at which the graveyard offer appears — TODOS.md §4. */
export const GRAVEYARD_THRESHOLD = 10;

export type TodoRowFlags = {
  isStale: boolean;
  isOverdue: boolean;
  daysOverdue: number;
  offerGraveyard: boolean;
};

function daysBetween(fromDateStr: string, toDateStr: string): number {
  const from = new Date(`${fromDateStr}T00:00:00Z`);
  const to = new Date(`${toDateStr}T00:00:00Z`);
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

export function deriveTodoFlags(todo: Todo, today: string): TodoRowFlags {
  const isOverdue = todo.state === "OPEN" && todo.dueDate !== null && todo.dueDate < today;
  return {
    isStale: todo.rolloverCount >= STALE_THRESHOLD,
    isOverdue,
    daysOverdue: isOverdue ? daysBetween(todo.dueDate as string, today) : 0,
    offerGraveyard: todo.state === "OPEN" && todo.rolloverCount >= GRAVEYARD_THRESHOLD,
  };
}
