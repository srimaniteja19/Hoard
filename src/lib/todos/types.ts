import { Energy } from "./parse";

export type Subtask = { id: string; title: string; done: boolean; position: number };

export type Todo = {
  id: string;
  title: string;
  note: string | null;
  energy: Energy;
  estimatedMinutes: number;
  actualMinutes: number | null;
  dueDate: string | null;
  rolloverCount: number;
  remindAt: string | null;
  recurrenceRule: string | null;
  recurrenceParentId: string | null;
  seriesPosition: number | null;
  state: "OPEN" | "DONE" | "DROPPED" | "GRAVEYARD";
  completedAt: string | null;
  tags: string[];
  subtasks: Subtask[];
};
