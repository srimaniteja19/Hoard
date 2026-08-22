export function isoDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addIsoDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  return isoDay(new Date(year, month - 1, day + days));
}

export function parseIsoDay(iso: string): { year: number; month: number; day: number } | null {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

export type MonthCell = {
  date: string;
  inMonth: boolean;
};

export function monthCells(year: number, month: number): MonthCell[] {
  const first = new Date(year, month - 1, 1);
  const start = new Date(year, month - 1, 1 - first.getDay());
  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({
      date: isoDay(date),
      inMonth: date.getMonth() === month - 1,
    });
  }
  return cells;
}

export function monthTitle(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function countOpenByDue(items: Array<{ dueDate: string | null; state: string }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    if (item.state !== "OPEN" || !item.dueDate) continue;
    counts[item.dueDate] = (counts[item.dueDate] ?? 0) + 1;
  }
  return counts;
}

export function weekContaining(iso: string): string[] {
  const parsed = parseIsoDay(iso);
  if (!parsed) return [];
  const date = new Date(parsed.year, parsed.month - 1, parsed.day);
  const start = new Date(parsed.year, parsed.month - 1, parsed.day - date.getDay());
  return Array.from({ length: 7 }, (_, index) =>
    isoDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
  );
}

export type WeekDayLoad = {
  date: string;
  count: number;
  minutes: number;
  deep: number;
  shallow: number;
  errand: number;
};

export function weekLoad(
  days: string[],
  todos: Array<{ dueDate: string | null; state: string; energy: string; estimatedMinutes: number }>
): WeekDayLoad[] {
  return days.map((date) => {
    const open = todos.filter((todo) => todo.state === "OPEN" && todo.dueDate === date);
    return {
      date,
      count: open.length,
      minutes: open.reduce((sum, todo) => sum + todo.estimatedMinutes, 0),
      deep: open.filter((todo) => todo.energy === "DEEP").reduce((sum, todo) => sum + todo.estimatedMinutes, 0),
      shallow: open.filter((todo) => todo.energy === "SHALLOW").reduce((sum, todo) => sum + todo.estimatedMinutes, 0),
      errand: open.filter((todo) => todo.energy === "ERRAND").reduce((sum, todo) => sum + todo.estimatedMinutes, 0),
    };
  });
}
