import { formatMinutes } from "@/lib/home/format";
import { computeDayPlan, type BusyBlock } from "./dayplan";

export type DayLoad = {
  openCount: number;
  openMinutes: number;
  unfittedMinutes: number;
};

export type LoadTask = {
  id: string;
  title: string;
  estimatedMinutes: number;
  dueDate: string | null;
  state: string;
};

export function dayLoadStamp({ openCount, openMinutes, unfittedMinutes }: DayLoad): string {
  if (openCount === 0) return "0 open";
  const parts = [`${openCount} open`, formatMinutes(openMinutes)];
  if (unfittedMinutes > 0) parts.push(`${formatMinutes(unfittedMinutes)} won’t fit`);
  return parts.join(" · ");
}

export function openLoadForDay(
  tasks: LoadTask[],
  options: {
    selected: string;
    today: string;
    nowMinutes: number;
    busy: BusyBlock[];
  }
): DayLoad {
  const open = tasks.filter((task) => {
    if (task.state !== "OPEN" || !task.dueDate) return false;
    if (options.selected === options.today) {
      return task.dueDate <= options.today;
    }
    return task.dueDate === options.selected;
  });

  const openCount = open.length;
  const openMinutes = open.reduce((sum, task) => sum + task.estimatedMinutes, 0);

  if (openCount === 0 || options.selected !== options.today) {
    return { openCount, openMinutes, unfittedMinutes: 0 };
  }

  const plan = computeDayPlan(
    options.busy,
    open.map((task) => ({ id: task.id, title: task.title, estimatedMinutes: task.estimatedMinutes })),
    options.nowMinutes
  );

  return {
    openCount,
    openMinutes,
    unfittedMinutes: plan.unfitted.reduce((sum, task) => sum + task.estimatedMinutes, 0),
  };
}

export function collectTags(todos: Array<{ tags: string[]; state: string }>): string[] {
  const seen = new Set<string>();
  for (const todo of todos) {
    if (todo.state !== "OPEN") continue;
    for (const tag of todo.tags) seen.add(tag);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}
