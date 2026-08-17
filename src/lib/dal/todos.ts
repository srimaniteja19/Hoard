import { db } from "@/db";
import { todos, rolloverEvents, dayNotes } from "@/db/schema";
import { eq, and, isNotNull, gte, lte, inArray } from "drizzle-orm";
import { getLoggedForDate } from "./shared";
import { calibration, CalibrationResult, CalibrationSample } from "@/lib/todos/calibration";

/**
 * Computes the user-local day a completed todo counts for, exactly as TIL's
 * `loggedFor` is computed (see src/lib/dal/shared.ts). Never derive this from
 * a raw UTC timestamp — see TODOS.md §2.
 */
export function getCompletedOnDate(timezone: string = "UTC", dateInput: Date = new Date()): string {
  return getLoggedForDate(timezone, dateInput);
}

/**
 * Converts a "YYYY-MM-DD" date + "HH:mm" wall-clock time, both in `timezone`,
 * to the UTC instant they refer to. Used to turn a parsed `remindAtLocal`
 * ("15:00") into an actual `remindAt` timestamp — never derive that from the
 * server's own local time.
 *
 * Standard guess-and-correct technique: build a UTC instant with the given
 * fields, see what wall-clock time that instant reads as in `timezone`, and
 * shift by the difference. Correct for all standard offsets including
 * fractional-hour zones; DST-transition instants (the one hour a local time
 * is ambiguous or doesn't exist) resolve to whichever side the JS runtime's
 * ICU data picks, which is an acceptable edge case for a reminder time.
 */
export function zonedTimeToUtc(dateStr: string, hhmm: string, timezone: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = hhmm.split(":").map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(new Date(guess))
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});

  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );

  const offsetMs = asIfUtc - guess;
  return new Date(guess - offsetMs);
}

/**
 * Every completed todo with a recorded actualMinutes — the calibration
 * sample set for this user. A dismissed actual-time prompt leaves
 * actualMinutes null, which is exactly what excludes that task here
 * (TODOS.md §6).
 */
export async function getCalibrationSamples(userId: string): Promise<CalibrationSample[]> {
  const rows = await db
    .select({ estimated: todos.estimatedMinutes, actual: todos.actualMinutes, energy: todos.energy })
    .from(todos)
    .where(and(eq(todos.userId, userId), eq(todos.state, "DONE"), isNotNull(todos.actualMinutes)));

  return rows.map((r) => ({ estimated: r.estimated, actual: r.actual as number, energy: r.energy }));
}

export async function getUserCalibration(userId: string): Promise<CalibrationResult> {
  const samples = await getCalibrationSamples(userId);
  return calibration(samples);
}

export type MonthHistoryTask = {
  id: string;
  title: string;
  estimatedMinutes: number;
  actualMinutes: number | null;
  energy: "DEEP" | "SHALLOW" | "ERRAND";
  completedOn: string;
};

export type MonthHistoryDay = {
  date: string;
  tasks: MonthHistoryTask[];
  rolled: boolean;
  cleanSweep: boolean;
};

/**
 * One grouped query over completedOn for every completed task in the month,
 * plus one for rollover events — TODOS.md §8: "do not fetch per cell." Both
 * are single queries regardless of how many days/cells the month has;
 * grouping into per-day buckets happens in JS, not per-cell SQL.
 */
export async function getMonthHistory(userId: string, year: number, month: number): Promise<Map<string, MonthHistoryDay>> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const [completedRows, rolledRows] = await Promise.all([
    db
      .select({
        id: todos.id,
        title: todos.title,
        estimatedMinutes: todos.estimatedMinutes,
        actualMinutes: todos.actualMinutes,
        energy: todos.energy,
        completedOn: todos.completedOn,
      })
      .from(todos)
      .where(
        and(
          eq(todos.userId, userId),
          eq(todos.state, "DONE"),
          gte(todos.completedOn, startDate),
          lte(todos.completedOn, endDate)
        )
      ),
    db
      .select({ occurredOn: rolloverEvents.occurredOn })
      .from(rolloverEvents)
      .where(and(eq(rolloverEvents.userId, userId), gte(rolloverEvents.occurredOn, startDate), lte(rolloverEvents.occurredOn, endDate))),
  ]);

  const rolledDays = new Set(rolledRows.map((r) => r.occurredOn));
  const byDay = new Map<string, MonthHistoryDay>();

  for (const row of completedRows) {
    const date = row.completedOn as string;
    if (!byDay.has(date)) {
      byDay.set(date, { date, tasks: [], rolled: rolledDays.has(date), cleanSweep: false });
    }
    byDay.get(date)!.tasks.push({
      id: row.id,
      title: row.title,
      estimatedMinutes: row.estimatedMinutes,
      actualMinutes: row.actualMinutes,
      energy: row.energy,
      completedOn: date,
    });
  }
  for (const date of rolledDays) {
    if (!byDay.has(date)) byDay.set(date, { date, tasks: [], rolled: true, cleanSweep: false });
    else byDay.get(date)!.rolled = true;
  }

  // "Clean sweep" — a day something got done and nothing was pushed away.
  for (const day of byDay.values()) {
    day.cleanSweep = day.tasks.length > 0 && !day.rolled;
  }

  return byDay;
}

export type DayRecord = {
  date: string;
  completed: MonthHistoryTask[];
  rolled: { id: string; title: string }[];
  note: string | null;
};

export async function getDayRecord(userId: string, date: string): Promise<DayRecord> {
  const [completedRows, rolledEventRows, [noteRow]] = await Promise.all([
    db
      .select({
        id: todos.id,
        title: todos.title,
        estimatedMinutes: todos.estimatedMinutes,
        actualMinutes: todos.actualMinutes,
        energy: todos.energy,
        completedOn: todos.completedOn,
      })
      .from(todos)
      .where(and(eq(todos.userId, userId), eq(todos.state, "DONE"), eq(todos.completedOn, date))),
    db.select({ todoId: rolloverEvents.todoId }).from(rolloverEvents).where(and(eq(rolloverEvents.userId, userId), eq(rolloverEvents.occurredOn, date))),
    db.select({ note: dayNotes.note }).from(dayNotes).where(and(eq(dayNotes.userId, userId), eq(dayNotes.date, date))).limit(1),
  ]);

  const rolledIds = rolledEventRows.map((r) => r.todoId);
  const rolledTodos =
    rolledIds.length === 0
      ? []
      : await db.select({ id: todos.id, title: todos.title }).from(todos).where(and(eq(todos.userId, userId), inArray(todos.id, rolledIds)));

  return {
    date,
    completed: completedRows.map((r) => ({
      id: r.id,
      title: r.title,
      estimatedMinutes: r.estimatedMinutes,
      actualMinutes: r.actualMinutes,
      energy: r.energy,
      completedOn: r.completedOn as string,
    })),
    rolled: rolledTodos,
    note: noteRow?.note ?? null,
  };
}

export async function upsertDayNote(userId: string, date: string, note: string): Promise<void> {
  await db
    .insert(dayNotes)
    .values({ userId, date, note })
    .onConflictDoUpdate({
      target: [dayNotes.userId, dayNotes.date],
      set: { note, updatedAt: new Date() },
    });
}
