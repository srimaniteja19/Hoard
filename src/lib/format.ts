/**
 * Unified duration formatter for HOARD.
 * Standardizes minute durations into clean, human-readable strings.
 * E.g.:
 * - 45 -> "45 MIN"
 * - 141 -> "2H 21M"
 * - 120 -> "2H"
 * - 0 -> "0 MIN"
 */
export function formatDuration(mins: number): string {
  const m = Math.max(0, Math.round(mins || 0));
  if (m < 60) {
    return `${m} MIN`;
  }
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return remM > 0 ? `${h}H ${remM}M` : `${h}H`;
}
