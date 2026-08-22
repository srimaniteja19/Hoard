export function localTimeValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function remindIsoFromLocal(dueDate: string, hhmm: string): string | null {
  const match = hhmm.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [year, month, day] = dueDate.split("-").map(Number);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, hour, minute, 0).toISOString();
}
