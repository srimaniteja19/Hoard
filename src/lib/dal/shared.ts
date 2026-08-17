import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Computes YYYY-MM-DD date string in the given IANA timezone.
 * Defaults to UTC if invalid or missing timezone.
 *
 * Used to derive any "which user-local day does this count for" column
 * (TIL's `loggedFor`, todos' `completedOn`) server-side, never from a raw
 * UTC timestamp — see TIL-SPEC.md §2.
 */
export function getLoggedForDate(timezone: string = "UTC", dateInput: Date = new Date()): string {
  const d = isNaN(dateInput.getTime()) ? new Date() : dateInput;
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(d); // Returns YYYY-MM-DD
  } catch {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

/**
 * Minutes since local midnight in the given timezone — the "now" anchor for
 * any same-day, time-of-day computation (day-plan gaps, free-time-remaining)
 * that must never be computed from the server's own local clock.
 */
export function getMinutesSinceMidnight(timezone: string, now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

const WEEKDAY_SHORT = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** 0=Sun..6=Sat in the given timezone — matches JS Date#getDay() and
 * busy_blocks.dayOfWeek, but computed from the user's actual timezone
 * rather than the server's. */
export function getLocalDayOfWeek(timezone: string, now: Date = new Date()): number {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" })
    .format(now)
    .toLowerCase()
    .slice(0, 3);
  const idx = WEEKDAY_SHORT.indexOf(wd);
  return idx === -1 ? now.getUTCDay() : idx;
}

/**
 * Returns user's IANA timezone setting from DB (defaults to UTC).
 */
export async function getUserTimezone(userId: string): Promise<string> {
  const [row] = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row?.timezone || "UTC";
}
