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
