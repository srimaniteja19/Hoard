import { getLoggedForDate } from "./shared";

/**
 * Computes the user-local day a completed todo counts for, exactly as TIL's
 * `loggedFor` is computed (see src/lib/dal/shared.ts). Never derive this from
 * a raw UTC timestamp — see TODOS.md §2.
 */
export function getCompletedOnDate(timezone: string = "UTC", dateInput: Date = new Date()): string {
  return getLoggedForDate(timezone, dateInput);
}
