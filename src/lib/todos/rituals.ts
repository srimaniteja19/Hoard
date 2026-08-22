import { isoDay } from "./calendar";
import { ruleOccursOn } from "./recurrence";

export type RitualLike = {
  id: string;
  title: string;
  state: string;
  dueDate: string | null;
  completedAt: string | null;
  recurrenceRule: string | null;
  recurrenceParentId: string | null;
  seriesPosition: number | null;
};

export type RitualMark = "done" | "open" | "miss" | "due" | "off";

export function isRitual(todo: { recurrenceRule: string | null; recurrenceParentId: string | null }): boolean {
  return Boolean(todo.recurrenceRule || todo.recurrenceParentId);
}

export function ritualRootId(todo: { id: string; recurrenceParentId: string | null }): string {
  return todo.recurrenceParentId ?? todo.id;
}

export function ritualLabel(rule: string | null): string {
  if (rule === "daily") return "DAILY";
  if (rule === "weekdays") return "WEEKDAYS";
  if (rule?.startsWith("weekly:")) return rule.slice(7);
  if (rule?.startsWith("monthly:")) return rule.slice(8);
  if (rule?.startsWith("yearly:")) return rule.slice(7);
  return "RITUAL";
}

function completedDay(todo: { completedAt: string | null }): string | null {
  if (!todo.completedAt) return null;
  const date = new Date(todo.completedAt);
  if (Number.isNaN(date.getTime())) return null;
  return isoDay(date);
}

export function ritualsForDay<T extends RitualLike>(todos: T[], selected: string, today: string): T[] {
  const roots = new Set<string>();
  for (const todo of todos) {
    if (isRitual(todo)) roots.add(ritualRootId(todo));
  }

  const shown: T[] = [];
  for (const rootId of roots) {
    const series = todos.filter((todo) => isRitual(todo) && ritualRootId(todo) === rootId);
    const rule = series.find((todo) => todo.recurrenceRule)?.recurrenceRule ?? null;
    const done = series.find((todo) => todo.state === "DONE" && completedDay(todo) === selected);
    if (done) {
      shown.push(done);
      continue;
    }
    const open = series.find((todo) => todo.state === "OPEN");
    if (!open) continue;
    if (rule && !ruleOccursOn(rule, selected)) continue;
    if (selected < today && open.dueDate !== selected) continue;
    shown.push(open);
  }
  return shown;
}

export function oneShotsForDay<T extends RitualLike>(
  todos: T[],
  selected: string,
  today: string,
  kind: "open" | "overdue" | "done"
): T[] {
  const shots = todos.filter((todo) => !isRitual(todo));
  if (kind === "overdue") {
    return shots.filter((todo) => todo.state === "OPEN" && todo.dueDate !== null && todo.dueDate < today);
  }
  if (kind === "done") {
    return shots.filter((todo) => todo.state === "DONE" && completedDay(todo) === selected);
  }
  return shots.filter((todo) => todo.state === "OPEN" && todo.dueDate === selected);
}

export function ritualWeekMarks(
  days: string[],
  today: string,
  rule: string,
  series: RitualLike[]
): Array<{ date: string; mark: RitualMark }> {
  const open = series.find((todo) => todo.state === "OPEN");
  return days.map((date) => {
    if (!ruleOccursOn(rule, date)) return { date, mark: "off" as const };
    if (series.some((todo) => todo.state === "DONE" && completedDay(todo) === date)) {
      return { date, mark: "done" as const };
    }
    if (
      open &&
      (open.dueDate === date || (date === today && open.dueDate !== null && open.dueDate < today))
    ) {
      return { date, mark: "open" as const };
    }
    if (date < today) return { date, mark: "miss" as const };
    return { date, mark: "due" as const };
  });
}
