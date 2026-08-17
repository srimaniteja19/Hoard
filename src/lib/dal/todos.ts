import { getLoggedForDate } from "./shared";

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
