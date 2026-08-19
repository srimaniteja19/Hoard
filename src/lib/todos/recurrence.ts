/**
 * Recurrence rule interpreter — TODOS.md §5.
 *
 * A deliberately small subset, not a full RRULE library:
 *   daily | weekdays | weekly:MON | monthly:15 | yearly:03-14
 *
 * Pure, no imports — same discipline as lib/todos/parse.ts. Only ever
 * asked "given this rule and this date, what's the next occurrence?" —
 * generation of the next instance happens once, on completion, never ahead
 * of time (§5).
 */

const WEEKDAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function parseDateStr(dateStr: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m, d };
}

function formatDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate(); // m is 1-indexed; day 0 of next month = last day of this one
}

function weekdayIndex(y: number, m: number, d: number): number {
  return new Date(y, m - 1, d).getDay();
}

function addDays(dateStr: string, days: number): string {
  const { y, m, d } = parseDateStr(dateStr);
  const dt = new Date(y, m - 1, d + days);
  return formatDate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

/**
 * Computes the next occurrence strictly after `fromDateStr`, per `rule`.
 * Returns null for an unrecognised rule rather than throwing — callers
 * should treat that as "not a recurring task" and skip successor creation.
 */
export function nextOccurrence(rule: string, fromDateStr: string): string | null {
  if (rule === "daily") {
    return addDays(fromDateStr, 1);
  }

  if (rule === "weekdays") {
    const { y, m, d } = parseDateStr(fromDateStr);
    const dow = weekdayIndex(y, m, d);
    const step = dow === 5 ? 3 : dow === 6 ? 2 : 1; // Fri->Mon, Sat->Mon, else +1
    return addDays(fromDateStr, step);
  }

  const weeklyMatch = rule.match(/^weekly:([A-Z]{3})$/);
  if (weeklyMatch) {
    const targetDow = WEEKDAY_NAMES.indexOf(weeklyMatch[1]);
    if (targetDow === -1) return null;
    const { y, m, d } = parseDateStr(fromDateStr);
    const fromDow = weekdayIndex(y, m, d);
    const diff = (targetDow - fromDow + 7) % 7 || 7; // always strictly after fromDate
    return addDays(fromDateStr, diff);
  }

  const monthlyMatch = rule.match(/^monthly:(\d{2})$/);
  if (monthlyMatch) {
    const targetDay = Number(monthlyMatch[1]);
    if (targetDay < 1 || targetDay > 31) return null;
    const { y, m } = parseDateStr(fromDateStr);
    const nextMonth = m === 12 ? 1 : m + 1;
    const nextYear = m === 12 ? y + 1 : y;
    const clampedDay = Math.min(targetDay, daysInMonth(nextYear, nextMonth));
    return formatDate(nextYear, nextMonth, clampedDay);
  }

  const yearlyMatch = rule.match(/^yearly:(\d{2})-(\d{2})$/);
  if (yearlyMatch) {
    const targetMonth = Number(yearlyMatch[1]);
    const targetDay = Number(yearlyMatch[2]);
    if (targetMonth < 1 || targetMonth > 12 || targetDay < 1 || targetDay > 31) return null;
    const { y } = parseDateStr(fromDateStr);
    const nextYear = y + 1;
    const clampedDay = Math.min(targetDay, daysInMonth(nextYear, targetMonth));
    return formatDate(nextYear, targetMonth, clampedDay);
  }

  return null;
}

export type SuccessorTemplate = {
  title: string;
  note: string | null;
  energy: "DEEP" | "SHALLOW" | "ERRAND";
  estimatedMinutes: number;
  recurrenceRule: string | null;
};

export type CompletedInstance = {
  id: string;
  recurrenceParentId: string | null;
  dueDate: string | null;
  completedOn: string | null;
  originalDueDate: string | null;
  seriesPosition: number | null;
};

export type SuccessorFields = {
  title: string;
  note: string | null;
  energy: "DEEP" | "SHALLOW" | "ERRAND";
  estimatedMinutes: number;
  dueDate: string;
  originalDueDate: string;
  recurrenceRule: string;
  recurrenceParentId: string;
  seriesPosition: number;
};

/**
 * What a recurring todo's successor should look like on completion —
 * TODOS.md §5. Template fields (title/note/energy/estimatedMinutes/
 * recurrenceRule) come from the series root's *current* values, not the
 * completed instance, so a "this and future" edit on the root actually
 * reaches later instances while a "this one" edit on a single instance
 * doesn't leak into the next. Doesn't decide `remindAt` — that needs a
 * timezone lookup, left to the caller alongside the DB fetch/insert.
 */
export function buildSuccessorFields(
  root: SuccessorTemplate,
  completedInstance: CompletedInstance
): SuccessorFields | null {
  if (!root.recurrenceRule) return null;

  const anchor = completedInstance.dueDate ?? completedInstance.completedOn ?? completedInstance.originalDueDate;
  if (!anchor) return null;

  const nextDue = nextOccurrence(root.recurrenceRule, anchor);
  if (!nextDue) return null;

  const rootId = completedInstance.recurrenceParentId ?? completedInstance.id;

  return {
    title: root.title,
    note: root.note,
    energy: root.energy,
    estimatedMinutes: root.estimatedMinutes,
    dueDate: nextDue,
    originalDueDate: nextDue,
    recurrenceRule: root.recurrenceRule,
    recurrenceParentId: rootId,
    seriesPosition: (completedInstance.seriesPosition ?? 1) + 1,
  };
}
